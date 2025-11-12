from fastapi import APIRouter, Request
from .blog_workflow_model import build_blog_graph, BlogState

router = APIRouter()

@router.post("/generate-blog")
async def generate_blog(request: Request):
    data = await request.json()

    # Extract and map form inputs
    topic = data.get("prompt") or "Untitled Topic"
    brief = data.get("existingDraft") or ""
    word_count = data.get("mediumWordCount") or 500
    tone = "friendly"
    audience = "general readers"

    # Build the workflow graph
    graph = build_blog_graph()

    # Initialize the LangGraph state
    state = BlogState(
        topic=topic,
        brief=brief,
        word_count=word_count,
        tone=tone,
        audience=audience,
    )

    # 🔥 Invoke LangGraph to generate the actual content
    result = graph.invoke(state)

    # Return the real model output
    return {
        "message": "Blog successfully generated",
        "generated_blog": result.get("draft", "⚠️ No draft generated"),
        "plan": result.get("plan"),
        "research": result.get("research_notes"),
        "social_assets": result.get("social_assets"),
        "summary": result.get("response"),
    }
