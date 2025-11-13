from fastapi import APIRouter, HTTPException, Request
from .agent_blog_workflow import BlogWorkflowAgent
import uuid

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
        "modalities": modalities
    }

router = APIRouter(tags=["Blog"])

agent = BlogWorkflowAgent()
agent.compile()

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
            "generated_blog": result.get("data", {}).get("blog_draft", "No draft generated"),
            "received_data": normalized_payload
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
