import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .agent_blog_workflow import BlogWorkflowAgent
from .blog_workflow_model import generate

# -------------------------------
# Normalize frontend input
# -------------------------------
DEFAULT_WORD_COUNTS = {
    "medium": 600,
    "linkedin": 200,
    "twitter": 100,
    "facebook": 150,
    "threads": 150,
    "instagram": 100,
}


def normalize_input(payload: dict) -> dict:
    """Convert frontend payload to BlogState-friendly structure, only including selected modalities."""
    selected = payload.get("modalities", [])
    modalities = {}

    for channel in selected:
        key = f"{channel}WordCount"
        modalities[channel] = payload.get(key, DEFAULT_WORD_COUNTS.get(channel, 100))

    return {
        "brand_name": payload.get("brandVoice", ""),
        "brand_voice": payload.get("brandVoice", ""),
        "prompt": payload.get("prompt", ""),
        "tone": payload.get("tone", ""),
        "audience": payload.get("audience", ""),
        "modalities": modalities,
    }


router = APIRouter(tags=["Blog"])

agent = BlogWorkflowAgent()
agent.compile()


class ImagePromptRequest(BaseModel):
    brand_voice: str = ""
    prompt: str = ""
    existing_draft: str = ""
    tone: str = ""
    audience: str = ""


@router.post("/generate-blog")
async def generate_blog(request: Request):
    """Receives frontend JSON, normalizes it, and runs the blog workflow."""
    try:
        payload = await request.json()
        print("Received payload:", payload)  # Debug log

        thread_id = str(uuid.uuid4())
        payload["threadId"] = thread_id

        normalized_payload = normalize_input(payload)
        normalized_payload["threadId"] = payload["threadId"]
        print("Normalized payload:", normalized_payload)  # Debug log

        result = await agent.ainvoke(normalized_payload)

        return {
            "status": "success",
            "threadId": thread_id,
            "generated_blog": result.get("data", {}).get(
                "formatted_blog", "No draft generated"
            ),
            "received_data": normalized_payload,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image-prompt")
def craft_image_prompt(payload: ImagePromptRequest):
    """Use the Groq LLM to craft an SDXL-friendly prompt from the blog context."""
    try:
        template = f"""
        You are a creative director crafting prompts for SDXL image generation.

        Brand voice:
        {payload.brand_voice or 'Not provided'}

        Blog idea:
        {payload.prompt or 'No primary prompt provided'}

        Existing draft or notes:
        {payload.existing_draft or 'None'}

        Tone: {payload.tone or 'Not provided'}
        Target audience: {payload.audience or 'Not provided'}

        Write a single paragraph prompt describing the imagery, camera details, mood, lighting, and colors.
        Do not exceed 120 words. Avoid mentioning 'prompt' or referencing the instructions.
    """
        prompt_text = generate(template, max_tokens=256, temperature=0.6)
        return {"image_prompt": prompt_text.strip()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
