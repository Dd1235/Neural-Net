from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend requests (adjust port if needed)
origins = [
    "http://localhost:3000",  # Next.js dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}

@app.post("/generate-blog")
async def generate_blog(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")
    brand_voice = data.get("brandVoice", "")
    existing_draft = data.get("existingDraft", "")
    modalities = data.get("modalities", [])
    medium_wc = data.get("mediumWordCount", 0)
    linkedin_wc = data.get("linkedinWordCount", 0)
    thread_id = data.get("threadId", "")

    # Later, replace this with LangGraph generation
    generated_text = (
        f"📝 Blog generated!\n\n"
        f"**Prompt:** {prompt}\n\n"
        f"**Brand Voice:** {brand_voice}\n\n"
        f"**Draft:** {existing_draft or 'N/A'}\n\n"
        f"**Modalities:** {', '.join([m['name'] for m in modalities if m['active']])}\n\n"
        f"**Medium Word Count:** {medium_wc}\n"
        f"**LinkedIn Word Count:** {linkedin_wc}\n"
        f"**Thread ID:** {thread_id or 'N/A'}"
    )

    return {"generated_blog": generated_text}