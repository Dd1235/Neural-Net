from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/ping")
def ping():
    """Simple liveness endpoint."""
    return {"message": "pong"}


@router.get("/health")
def health():
    """Basic readiness endpoint."""
    return {"status": "ok"}
