import base64
import io
import os

import modal
from PIL import Image
from pydantic import BaseModel

app = modal.App("nn-image_caption")

caption_hf_volume = modal.Volume.from_name("caption-hf-cache", create_if_missing=True)

caption_image = (
    modal.Image.debian_slim()
    .pip_install_from_requirements("requirements.txt")
    .env({"HF_HOME": "/root/.cache/huggingface"})
)


class CaptionRequest(BaseModel):
    image_base64: str
    prompt: str = ""


class CaptionResponse(BaseModel):
    caption: str


@app.cls(
    image=caption_image,
    cpu=2,
    memory=2048,
    volumes={"/root/.cache/huggingface": caption_hf_volume},
    scaledown_window=30,
)
class ImageCaptionServer:
    @modal.enter()
    def load_model(self):
        print("Loading Vit-GPT2 Image Captioning model with cache...")

        from transformers import (
            AutoTokenizer,
            VisionEncoderDecoderModel,
            ViTImageProcessor,
        )

        self.device = "cpu"

        # Use shared HF cache
        cache_dir = "/root/.cache/huggingface"

        # Load model + tokenizer + processor
        self.model = VisionEncoderDecoderModel.from_pretrained(
            "nlpconnect/vit-gpt2-image-captioning",
            cache_dir=cache_dir,
        ).to(self.device)

        self.feature_extractor = ViTImageProcessor.from_pretrained(
            "nlpconnect/vit-gpt2-image-captioning",
            cache_dir=cache_dir,
        )

        self.tokenizer = AutoTokenizer.from_pretrained(
            "nlpconnect/vit-gpt2-image-captioning",
            cache_dir=cache_dir,
        )

        print("Vit-GPT2 caption model ready (cached).")

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=False)
    def caption_image(self, request: CaptionRequest) -> CaptionResponse:
        import torch

        # Decode Base64 image
        img_bytes = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        # Preprocess image
        pixel_values = self.feature_extractor(
            images=image,
            return_tensors="pt",
        ).pixel_values.to(self.device)

        # Generate caption
        output_ids = self.model.generate(
            pixel_values,
            max_length=30,
            num_beams=3,
        )

        caption = self.tokenizer.decode(
            output_ids[0],
            skip_special_tokens=True,
        ).strip()

        return CaptionResponse(caption=caption)


@app.local_entrypoint()
def main():
    server = ImageCaptionServer()
    endpoint = server.caption_image.get_web_url()

    print("POST →", endpoint)

    with open("sample.jpg", "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    payload = {
        "image_base64": b64,
        "prompt": "caption this image for instagram",
    }

    import requests

    res = requests.post(endpoint, json=payload)
    print("Status:", res.status_code)
    print(res.text)
