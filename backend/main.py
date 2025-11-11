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
    topic = data.get("topic", "")
    return {"generated_blog": f"This is a sample blog on {topic}."}
