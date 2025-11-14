from fastapi import APIRouter, HTTPException, Request
from .agent_news_workflow import NewsArticleWorkflowAgent
import uuid

# -------------------------------
# Normalize frontend input for News
# -------------------------------
def normalize_news_input(payload: dict) -> dict:
    """Convert news frontend payload to a clean state for the agent."""
    # These keys match the 'formData' state in NewsArticleWorkflowPage.tsx
    return {
        "prompt": payload.get("prompt", ""),
        "additional_context": payload.get("existingDraft", ""), # 'existingDraft' from frontend
        "word_count": payload.get("articleWordCount", 800), # 'articleWordCount' from frontend
        "tone": payload.get("tone", ""),
        "audience": payload.get("audience", ""),
    }

# -------------------------------
# Router and Agent Setup
# -------------------------------
router = APIRouter(tags=["News"])

agent = NewsArticleWorkflowAgent()
agent.compile()

# -------------------------------
# News Article Generation Endpoint
# -------------------------------
@router.post("/generate-news-article")
async def generate_news_article(request: Request):
    """Receives frontend JSON, normalizes it, and runs the news article workflow."""
    try:
        payload = await request.json()
        print("Received news payload:", payload)  # Debug log

        # Use thread_id from payload if provided, else create a new one
        thread_id = payload.get("threadId") or str(uuid.uuid4())
        
        normalized_payload = normalize_news_input(payload)
        normalized_payload["threadId"] = thread_id # Pass thread_id to the agent
        print("Normalized news payload:", normalized_payload)  # Debug log

        # Call the news agent
        result = await agent.ainvoke(normalized_payload, thread_id=thread_id)

        # Check for errors returned from the agent
        if result.get("status") == "error":
             raise Exception(result.get("message", "Unknown agent error"))

        # Return the 'generated_article' key, as expected by the frontend
        return {
            "status": "success",
            "threadId": thread_id,
            "generated_article": result.get("data", {}).get("article_draft", "No article generated"),
            "received_data": normalized_payload
        }

    except Exception as e:
        print(f"Error in /generate-news-article: {e}")
        raise HTTPException(status_code=500, detail=str(e))
