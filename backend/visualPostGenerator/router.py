from fastapi import APIRouter, HTTPException
from .agent_visual_content_workflow import VisualContentAgent, VisualPostInput

# -------------------------------
# Initialize Router & Agent
# -------------------------------
router = APIRouter(tags=["Visual Content Generator"])

# Initialize the agent
# This is a crucial step: it loads the BLIP model into memory
# *once* when the server starts.
try:
    visual_agent = VisualContentAgent()
except Exception as e:
    print(f"CRITICAL ERROR: Failed to initialize VisualContentAgent: {e}")
    print("This is likely due to the BLIP model failing to load.")
    visual_agent = None

# -------------------------------
# New Visual Content Endpoint
# -------------------------------
@router.post("/generate-visual-post")
def generate_visual_post(input_data: VisualPostInput):
    """
    Receives an image (Base64), text context, and a platform.
    Runs the full workflow:
    1. BLIP (Image caption)
    2. Tavily (Trend research)
    3. Groq (Post generation)
    
    Returns a single generated post.
    """
    if visual_agent is None:
        raise HTTPException(
            status_code=500, 
            detail="Visual agent is not available. Check server logs for BLIP model loading errors."
        )
        
    try:
        # Debug log
        print(f"Received visual post request for platform: {input_data.platform}")

        # Use the synchronous 'invoke' method
        # FastAPI will handle this in a threadpool
        result = visual_agent.invoke(input_data)

        # The agent's invoke method returns an "error" key on failure
        if "error" in result:
            print(f"Error in /generate-visual-post: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])

        # Success: return the generated post
        return {
            "status": "success",
            "generated_post": result.get("generated_post")
        }

    except Exception as e:
        print(f"Unhandled error in /generate-visual-post: {e}")
        raise HTTPException(status_code=500, detail=str(e))