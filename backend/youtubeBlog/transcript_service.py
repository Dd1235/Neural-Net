import re
from typing import Any, Dict, List, Optional

import requests
import yt_dlp
from youtube_transcript_api import (
    NoTranscriptFound,
    NotTranslatable,
    TranscriptsDisabled,
    YouTubeTranscriptApi,
)


VIDEO_ID_PATTERN = re.compile(r"(?:v=|youtu\.be/)([\w-]{11})")


class TranscriptError(RuntimeError):
    """Custom error raised when a transcript cannot be produced."""


def extract_video_id(youtube_url: str) -> str:
    """Extract the canonical 11-character video id from supported URLs."""
    match = VIDEO_ID_PATTERN.search(youtube_url)
    if not match:
        raise ValueError("Invalid YouTube URL")
    return match.group(1)


def get_video_metadata(video_url: str) -> Dict[str, Any]:
    """Fetch lightweight metadata (title, duration, description) via yt_dlp."""
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return {
                "title": info.get("title"),
                "duration": info.get("duration"),
                "description": info.get("description"),
                "channel": info.get("uploader"),
            }
    except Exception as exc:  # pragma: no cover - surfaced to API
        raise TranscriptError(f"Unable to fetch video metadata: {exc}") from exc


def fetch_transcript(video_id: str) -> List[Dict[str, Any]]:
    """
    Attempt to fetch an English transcript.
    Falls back to automatic captions/translation when needed.
    """
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        try:
            transcript = transcript_list.find_transcript(["en", "en-US", "en-GB"])
        except NoTranscriptFound:
            manually_created = list(transcript_list._manually_created_transcripts.values())
            generated = list(transcript_list._generated_transcripts.values())
            available = manually_created + generated
            language_codes = [t.language_code for t in available]
            if not language_codes:
                raise NoTranscriptFound(video_id, [], transcript_list)
            transcript = transcript_list.find_transcript(language_codes)

        if transcript.language_code != "en":
            if transcript.is_translatable:
                transcript = transcript.translate("en")
            else:
                raise NotTranslatable(video_id)

        return transcript.fetch()
    except TranscriptsDisabled as exc:
        raise TranscriptError("Transcripts are disabled for this video.") from exc
    except NoTranscriptFound as exc:
        raise TranscriptError("No transcript available for this video.") from exc
    except NotTranslatable as exc:
        raise TranscriptError("Transcript is not translatable to English.") from exc
    except Exception as exc:  # pragma: no cover - surfaced to API
        try:
            fallback = fetch_transcript_via_ytdlp(video_id)
            if fallback:
                return fallback
        except TranscriptError:
            pass
        raise TranscriptError(f"Failed to fetch transcript: {exc}") from exc


def transcript_to_text(transcript: List[Dict[str, Any]], max_chars: int = 12000) -> str:
    """Convert transcript segments to a single block of text with an optional cap."""
    combined = " ".join(segment.get("text", "") for segment in transcript).strip()
    if max_chars and len(combined) > max_chars:
        return combined[:max_chars] + "..."
    return combined


def fetch_transcript_via_ytdlp(video_id: str) -> List[Dict[str, Any]]:
    """Fallback mechanism that downloads auto captions via yt_dlp when the transcript API fails."""
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "no_warnings": True,
        "subtitleslangs": ["en", "en-US", "en-GB"],
        "subtitlesformat": "vtt",
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
    except Exception as exc:
        raise TranscriptError(f"yt-dlp could not fetch captions: {exc}") from exc

    captions = info.get("automatic_captions") or info.get("subtitles")
    if not captions:
        raise TranscriptError("No captions found via yt-dlp fallback.")

    subtitle_entry = _select_caption_entry(captions)
    if not subtitle_entry or "url" not in subtitle_entry:
        raise TranscriptError("yt-dlp did not return a usable caption URL.")

    try:
        response = requests.get(subtitle_entry["url"], timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise TranscriptError(f"Unable to download caption file: {exc}") from exc

    segments = _parse_vtt(response.text)
    if not segments:
        raise TranscriptError("Unable to parse captions returned by yt-dlp.")
    return segments


def _select_caption_entry(captions: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    preferred_langs = ["en", "en-US", "en-GB"]
    for lang in preferred_langs:
        entries = captions.get(lang)
        if isinstance(entries, list) and entries:
            return entries[0]
    # pick any available language
    for entries in captions.values():
        if isinstance(entries, list) and entries:
            return entries[0]
    return None


def _parse_vtt(vtt_text: str) -> List[Dict[str, Any]]:
    """Simplistic WebVTT parser that returns segments with start/duration/text."""
    def parse_timestamp(timestamp: str) -> float:
        hours, minutes, seconds = timestamp.split(":")
        sec, _, fraction = seconds.partition(".")
        total = int(hours) * 3600 + int(minutes) * 60 + int(sec)
        if fraction:
            total += float(f"0.{fraction}")
        return total

    segments: List[Dict[str, Any]] = []
    start_time = 0.0
    end_time = 0.0
    buffer: List[str] = []

    for raw_line in vtt_text.splitlines():
        line = raw_line.strip()
        if not line:
            if buffer:
                text = " ".join(buffer).strip()
                if text:
                    segments.append(
                        {
                            "text": text,
                            "start": start_time,
                            "duration": max(0.0, end_time - start_time),
                        }
                    )
                buffer = []
            continue

        if line.startswith("WEBVTT") or line.isdigit():
            continue

        if "-->" in line:
            timestamps = line.split("-->")
            if len(timestamps) == 2:
                start_time = parse_timestamp(timestamps[0].strip())
                end_time = parse_timestamp(timestamps[1].split(" ")[0].strip())
            continue

        buffer.append(line)

    if buffer:
        text = " ".join(buffer).strip()
        if text:
            segments.append(
                {
                    "text": text,
                    "start": start_time,
                    "duration": max(0.0, end_time - start_time),
                }
            )
    return segments
