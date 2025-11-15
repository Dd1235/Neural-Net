import os
import uuid

import modal
import soundfile as sf
from pydantic import BaseModel

app = modal.App("nn-parler-tts")

parler_hf_volume = modal.Volume.from_name("parler-hf-cache", create_if_missing=True)

tts_secrets = modal.Secret.from_name("nn-secret")

parler_image = (
    modal.Image.debian_slim()
    .apt_install("git")
    .pip_install(
        "torch", "accelerate", "sentencepiece", "soundfile", "supabase", "fastapi"
    )
    .pip_install("git+https://github.com/huggingface/parler-tts.git")
    .env({"HF_HOME": "/root/parler_cache"})
)


class TTSRequest(BaseModel):
    text: str
    description: str | None = None


@app.cls(
    image=parler_image,
    # cpu=2,  # CPU works fine for mini model
    gpu="A10G",
    memory=4096,
    timeout=300,
    secrets=[tts_secrets],
    volumes={"/root/parler_cache": parler_hf_volume},
)
class ParlerTTS:
    @modal.enter()
    def setup(self):
        import torch
        from parler_tts import ParlerTTSForConditionalGeneration
        from supabase import create_client
        from transformers import AutoTokenizer

        # Ensure HF cache points to our mounted volume
        os.environ["HF_HOME"] = "/root/parler_cache"

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        print("Loading Parler-TTS...")
        self.model = ParlerTTSForConditionalGeneration.from_pretrained(
            "parler-tts/parler-tts-mini-v1"
        ).to(self.device)

        self.tokenizer = AutoTokenizer.from_pretrained("parler-tts/parler-tts-mini-v1")

        print("Initializing Supabase...")
        self.supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
        self.bucket = os.environ["SUPABASE_AUDIO_BUCKET"]

        print("Parler-TTS server ready.")

    @modal.fastapi_endpoint(method="POST")
    def tts(self, req: TTSRequest):
        import torch

        text = req.text
        description = req.description or (
            "A neutral, clear, warm voice speaking at medium speed, "
            "close microphone, high audio quality."
        )

        input_ids = self.tokenizer(description, return_tensors="pt").input_ids.to(
            self.device
        )
        prompt_ids = self.tokenizer(text, return_tensors="pt").input_ids.to(self.device)

        generation = self.model.generate(
            input_ids=input_ids, prompt_input_ids=prompt_ids
        )

        audio = generation.cpu().numpy().squeeze()
        sample_rate = self.model.config.sampling_rate

        file_key = f"{uuid.uuid4()}.wav"
        file_path = f"/tmp/{file_key}"

        sf.write(file_path, audio, sample_rate)

        with open(file_path, "rb") as f:
            self.supabase.storage.from_(self.bucket).upload(
                file_key, f, file_options={"content-type": "audio/wav"}
            )

        os.remove(file_path)

        public_url = (
            f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/"
            f"{self.bucket}/{file_key}"
        )

        return {"audio_url": public_url}


@app.local_entrypoint()
def main():
    server = ParlerTTS()
    url = server.tts.get_web_url()

    print("POST →", url)

    import requests

    payload = {
        "text": (
            "Hey, did you know this? The new TITANS paper shows you can train giant models "
            "way faster and with way less compute—by rethinking the whole optimization pipeline! "
            "They literally beat traditional scaling laws by tuning how models learn over time. "
            "It’s wild—and it might redefine how we build the next generation of AI."
        ),
        "description": (
            "An energetic male smart sounding narrator with a bright, enthusiastic tone and a deep voice."
        ),
    }

    response = requests.post(url, json=payload)

    print("Status:", response.status_code)
    print("Response:", response.text)
