from typing import Dict, Any
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import re

load_dotenv()

# -------------------------------
# Initialize Groq client
# -------------------------------
client = Groq()
research_client = Groq()


# -------------------------------
# Helper Functions
# -------------------------------
def generate(prompt: str, max_tokens=512, temperature=0.7) -> str:
    """Use Groq to generate text."""
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_completion_tokens=max_tokens,
        top_p=1,
        stream=False,
    )
    return completion.choices[0].message.content.strip()


def generate_research(prompt: str, max_tokens=512, temperature=0.7) -> str:
    """Research agent using a cheaper model."""
    completion = research_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_completion_tokens=max_tokens,
        top_p=1,
        stream=False,
    )
    return completion.choices[0].message.content.strip()


def determine_duration(videoType: str, prompt: str) -> int:
    """Longform = 15 min. Shortform = extract seconds/minutes from prompt."""
    if videoType == "longform":
        return 15

    # extract seconds
    match = re.search(r"(\d+)\s*(seconds|second|sec)", prompt.lower())
    if match:
        seconds = int(match.group(1))
        return max(1, seconds // 60)

    # extract minutes
    match = re.search(r"(\d+)\s*(minutes|minute|min)", prompt.lower())
    if match:
        return int(match.group(1))

    # default shortform = 1 minute
    return 1


# -------------------------------
# State Schema
# -------------------------------
class YoutubeScript(BaseModel):
    # Inputs from frontend
    channelDescription: str = ""
    prompt: str = ""
    subscribers: str = ""
    videoType: str = "shortform"  # "shortform" or "longform"
    tone: str = ""
    audience: str = ""
    threadId: str = "e.g. session-abc123"

    # Workflow fields
    research_notes: str | None = None
    script_draft: str | None = None
    compliance_report: str | None = None
    revision_notes: str | None = None
    revision_count: int = 0


# -------------------------------
# Nodes
# -------------------------------
def topic_research(state: YoutubeScript) -> Dict[str, Any]:
    """Research topic context for the YouTube script."""
    prompt = f"""
You are a YouTube research strategist.

Research background material for the video topic:
"{state.prompt}"

Return:
- 4 factual bullet points
- 2 trending angles
- 2 interesting hooks
"""
    return {"research_notes": generate_research(prompt, 512)}


def generate_script(state: YoutubeScript) -> Dict[str, Any]:
    """Generate YouTube script with pacing, camera cues, structure."""
    duration = determine_duration(state.videoType, state.prompt)

    style = (
        "Write in a fast-paced, punchy TikTok/Shorts pacing with jump cuts."
        if state.videoType == "shortform"
        else "Write in a structured long-form YouTube documentary/narrative style."
    )

    prompt = f"""
You are a professional YouTube scriptwriter.

Write a script for a {duration}-minute video.
Platform Style: {state.videoType}
Tone: {state.tone}
Audience: {state.audience}
Channel Description: {state.channelDescription}
Subscribers: {state.subscribers}

Topic:
{state.prompt}

Research Notes:
{state.research_notes}

Guidelines:
- Include HOOK, INTRO, BODY sections, and OUTRO/CTA.
- Add pacing markers like [CUT], [ZOOM IN], [SCENE CHANGE].
- Use creator-friendly, conversational language.
- {style}
"""
    return {"script_draft": generate(prompt, 1024)}


def compliance_review(state: YoutubeScript) -> Dict[str, Any]:
    """Review script for safety, accuracy, tone, and pacing."""
    prompt = f"""
You are a YouTube content compliance reviewer.

Review the script for:
- Factual accuracy
- Tone consistency ("{state.tone}")
- Platform-friendly wording
- Audience suitability ("{state.audience}")
- Engagement quality

Script:
{state.script_draft}

Return:
- Verdict: APPROVED or REVISION_NEEDED
- Bullet-point notes
"""
    return {"compliance_report": generate(prompt, 512)}


def revision_step(state: YoutubeScript) -> Dict[str, Any]:
    """Revise script only if needed."""
    if "APPROVED" in (state.compliance_report or "").upper():
        return {"revision_notes": "No revision needed."}

    prompt = f"""
You are a YouTube script editor.

Revise the script based on this feedback:

Feedback:
{state.compliance_report}

Original Script:
{state.script_draft}

Make improvements but keep the style consistent.
"""
    new_script = generate(prompt, 1024)

    return {
        "revision_notes": "Revised based on compliance.",
        "revision_count": state.revision_count + 1,
        "script_draft": new_script,
    }


def finalize(state: YoutubeScript) -> Dict[str, Any]:
    """Final output bundle."""
    return {
        "response": "YouTube script generation completed.",
        "final_script": state.script_draft,
        "revision_count": state.revision_count,
    }


# -------------------------------
# Build the Graph
# -------------------------------
def build_youtube_graph() -> StateGraph:
    graph = StateGraph(YoutubeScript)

    graph.add_node("topic_research", topic_research)
    graph.add_node("generate_script", generate_script)
    graph.add_node("compliance_review", compliance_review)
    graph.add_node("revision_step", revision_step)
    graph.add_node("finalize", finalize)

    graph.add_edge(START, "topic_research")
    graph.add_edge("topic_research", "generate_script")
    graph.add_edge("generate_script", "compliance_review")
    graph.add_edge("compliance_review", "revision_step")
    graph.add_edge("revision_step", "finalize")
    graph.add_edge("finalize", END)

    return graph
