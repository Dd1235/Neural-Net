from __future__ import annotations

from typing import Any, Dict

from groq import Groq
from pydantic import BaseModel, Field, HttpUrl

from backend.youtubeBlog.transcript_service import (
    extract_video_id,
    fetch_transcript,
    get_video_metadata,
    transcript_to_text,
)


class YouTubeBlogInput(BaseModel):
    youtube_url: HttpUrl
    prompt: str = Field(
        ..., description="Describe the specific angle or topic you want covered."
    )
    word_count: int = Field(
        default=600,
        ge=200,
        le=2000,
        description="Approximate number of words for the generated article.",
    )


class YouTubeBlogAgent:
    """Orchestrates transcript retrieval and Groq-powered writing."""

    def __init__(self) -> None:
        self.client = Groq()

    def invoke(self, payload: YouTubeBlogInput) -> Dict[str, Any]:
        video_url = str(payload.youtube_url)
        video_id = extract_video_id(video_url)

        metadata = get_video_metadata(video_url)
        transcript_segments = fetch_transcript(video_id)
        transcript_text = transcript_to_text(transcript_segments)

        blog_post = self._generate_blog(
            transcript_text=transcript_text,
            metadata=metadata,
            instructions=payload.prompt,
            word_count=payload.word_count,
        )
        summary = self._generate_summary(blog_post, metadata)

        return {
            "status": "success",
            "video_url": video_url,
            "metadata": {**metadata, "video_id": video_id},
            "word_count": payload.word_count,
            "blog_post": blog_post,
            "summary": summary,
            "transcript_characters": len(transcript_text),
        }

    def _generate_blog(
        self,
        *,
        transcript_text: str,
        metadata: Dict[str, Any],
        instructions: str,
        word_count: int,
    ) -> str:
        """Use Groq to craft a markdown blog post based on transcript and prompt."""
        system_prompt = (
            "You are an editorial assistant who turns transcripts into structured, "
            "engaging long-form articles."
        )
        user_prompt = f"""
            Using the following YouTube video context, write a {word_count}-word article in Markdown.

            - Video Title: {metadata.get('title') or 'Untitled'}
            - Channel: {metadata.get('channel') or 'Unknown creator'}
            - Video Description: {metadata.get('description') or 'No description provided.'}
            - Custom Instructions: {instructions or 'Follow the transcript faithfully.'}

            Structure:
            1. Craft an SEO-friendly title.
            2. Provide an engaging introduction that hooks the reader in 2-3 sentences.
            3. Create 3-4 thematic sections with `##` headings that explain key moments or takeaways.
            4. Close with a concise conclusion plus an optional call-to-action.

            Keep quotes accurate, avoid hallucinations, and ground everything in the transcript supplied below.

            Transcript:
            {transcript_text}
            """
        completion = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_completion_tokens=2048,
            top_p=0.9,
        )
        return completion.choices[0].message.content.strip()

    def _generate_summary(self, blog_post: str, metadata: Dict[str, Any]) -> str:
        """Short summary for quick previews."""
        prompt = f"""
            Summarize the following blog draft in under 180 words.
            Return a short paragraph followed by 3 concise bullet takeaways.
            Mention the video title "{metadata.get('title') or 'this video'}" once.

            BLOG:
            {blog_post}
            """
        completion = self.client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_completion_tokens=512,
        )
        return completion.choices[0].message.content.strip()
