from fastapi import APIRouter, HTTPException, Request
from .agent_youtube_script import YoutubeScriptAgent
import uuid


router = APIRouter(tags=["YouTube Script"])

agent = YoutubeScriptAgent()
agent.compile()


@router.post("/generate-youtube-script")
async def generate_youtube_script(request: Request):
    """Receives frontend JSON and runs the YouTube script workflow."""
    try:
        payload = await request.json()
        print("Received payload:", payload)

        # Generate thread ID
        thread_id = str(uuid.uuid4())
        payload["threadId"] = thread_id

        print("Payload passed to agent:", payload)

        # Run agent
        result = await agent.ainvoke(payload)

        return {
            "status": "success",
            "threadId": thread_id,
            "generated_script": result.get("data", {}).get("script", "No script generated"),
            "revision_count": result.get("data", {}).get("revision_count", 0),
            "received_data": payload
        }

    except Exception as e:
        print("🔥 Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
