from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/generate-blog")
async def generate_blog(request: Request):
    data = await request.json()

    # Extract form inputs (just for dummy print)
    topic = data.get("prompt") or "Untitled Topic"
    brief = data.get("existingDraft") or ""
    word_count = data.get("mediumWordCount") or 500
    tone = "friendly"
    audience = "general readers"

    # Dummy print to console
    print("Received request data:", data)

    # Dummy output
    return {
        "generated_blog": f"Dummy blog for topic '{topic}' with {word_count} words in {tone} tone."
    }
