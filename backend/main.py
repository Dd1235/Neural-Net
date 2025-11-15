from blog.router import router as blog_router
from content.router import router as content_router
from contentRepurposer.router import router as contentRepurposer_router
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from health.router import router as health_router
from news.router import router as news_router
from visualPostGenerator.router import router as caption_router
from x_post.router import router as xpost_router
from youtube.router import router as youtube_route
from youtubeBlog.router import router as youtube_router

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
app.include_router(content_router)
app.include_router(contentRepurposer_router)
app.include_router(youtube_router)
app.include_router(health_router)
app.include_router(caption_router)
app.include_router(youtube_route)

app.include_router(xpost_router)
