from fastapi import APIRouter, HTTPException

from .agent import YouTubeBlogAgent, YouTubeBlogInput
from .transcript_service import TranscriptError

router = APIRouter(tags=["YouTube Blog"])

agent = YouTubeBlogAgent()


@router.post("/youtube-blog")
def generate_youtube_blog(input_data: YouTubeBlogInput):
    """
    Generate a markdown blog post directly from a YouTube URL, desired prompt, and word count.
    """
    try:
        return agent.invoke(input_data)
    except TranscriptError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # pragma: no cover - surfacing runtime issues
        raise HTTPException(status_code=500, detail=str(exc))
