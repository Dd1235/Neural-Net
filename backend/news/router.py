from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/generate-news")
async def generate_news(request: Request) -> dict:
    data = await request.json()

    topic = data.get("prompt") or "Untitled Topic"
    brief = data.get("existingDraft") or ""
    tone = data.get("tone") or "friendly"
    audience = data.get("audience") or "general readers"

    print("Received request data:", data)

    return {
        "generated_blog": f"Dummy news for topic '{topic}' in {tone} tone for {audience}."
    }
