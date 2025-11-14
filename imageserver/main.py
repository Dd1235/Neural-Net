import os
import uuid
from typing import List

import modal
import requests
from pydantic import BaseModel
from supabase import Client, create_client

app = modal.App("nn-image")

image = (
    modal.Image.debian_slim()
    .apt_install("git")
    .pip_install_from_requirements("requirements.txt")
    .env({"HF_HOME": "/.cache/huggingface"})
)

hf_volume = modal.Volume.from_name("sdxl-hf-cache", create_if_missing=True)

imagegen_secrets = modal.Secret.from_name("nn-secret")


class ImageRequest(BaseModel):
    prompt: str
    guidance_scale: float = 0.0
    num_steps: int = 2


class ImageResponse(BaseModel):
    file_key: str
    public_url: str


@app.cls(
    image=image,
    gpu="L40S",
    volumes={"/.cache/huggingface": hf_volume},
    secrets=[imagegen_secrets],
    scaledown_window=30,
)
class ImageGenServer:
    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import AutoPipelineForText2Image

        print("Loading SDXL Turbo...")
        self.pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16",
            cache_dir="/.cache/huggingface",
        ).to("cuda")

        # Supabase client (server-side)
        self.supabase: Client = create_client(
            os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        )
        self.bucket = os.environ["SUPABASE_BUCKET"]

        print("SDXL Turbo loaded!")
        print("Supabase client initialized!")

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=False)
    def generate_image(self, request: ImageRequest) -> ImageResponse:
        import torch

        prompt = request.prompt
        output_dir = "/tmp/images"
        os.makedirs(output_dir, exist_ok=True)

        img = self.pipe(
            prompt=prompt,
            num_inference_steps=request.num_steps,
            guidance_scale=request.guidance_scale,
        ).images[0]

        file_key = f"{uuid.uuid4()}.png"
        img_path = os.path.join(output_dir, file_key)
        img.save(img_path)

        with open(img_path, "rb") as f:
            self.supabase.storage.from_(self.bucket).upload(
                file_key,
                f,
                file_options={"content-type": "image/png"},
            )

        os.remove(img_path)

        public_url = (
            f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/"
            f"{self.bucket}/{file_key}"
        )

        return ImageResponse(file_key=file_key, public_url=public_url)


# Local test entrypoint
@app.local_entrypoint()
def main():
    server = ImageGenServer()
    endpoint_url = server.generate_image.get_web_url()

    print("POST →", endpoint_url)
    payload = {"prompt": "cute cat astronaut"}

    response = requests.post(endpoint_url, json=payload)

    print("Status:", response.status_code)
    print("Response:", response.text)
