from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from blog.router import router as blog_router
from news.router import router as news_router
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

app.include_router(blog_router)
app.include_router(news_router)
