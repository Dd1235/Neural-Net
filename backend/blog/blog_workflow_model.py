from typing import Dict, Any
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# -------------------------------
# Initialize Groq client
# -------------------------------
client = Groq()  # Uses GROQ_API_KEY from environment
research_client = Groq()  # Smaller agent for research (llama-3.1-8b-instant)

def generate(prompt: str, max_tokens=512, temperature=0.7) -> str:
    """Use Groq API to generate text from prompt."""
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
    """Secondary agent for topic research."""
    completion = research_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_completion_tokens=max_tokens,
        top_p=1,
        stream=False,
    )
    return completion.choices[0].message.content.strip()

# -------------------------------
# State Schema
# -------------------------------
class BlogState(BaseModel):
    # 🧠 Input from frontend
    brand_name: str = ""
    brand_voice: str = ""
    prompt: str = ""
    tone: str = ""
    audience: str = ""
    modalities: Dict[str, int] = Field(default_factory=dict)  # {"medium": 600, "linkedin": 200}

    # 🔄 Workflow-generated fields
    brand_history: str | None = None
    research_notes: str | None = None
    blog_draft: str | None = None
    compliance_report: str | None = None
    revision_notes: str | None = None
    social_assets: Dict[str, str] | None = None
    revision_count: int = 0


# -------------------------------
# Nodes
# -------------------------------

def brand_context_research(state: BlogState) -> Dict[str, Any]:
    """Step 1: Research brand history and tone context."""
    prompt = f"""
You are a Brand Analyst.

Research and summarize the brand **{state.brand_name}**.

Return sections:
- Brand Voice Summary
- Past Campaigns & History
- Recurring Themes
- Tone & Audience Insights
- Alignment Recommendations
"""
    return {"brand_history": generate(prompt, 512)}


def topic_research(state: BlogState) -> Dict[str, Any]:
    prompt = f"""
You are a Research Strategist.

List 3–4 credible findings, trends, or statistics related to the topic:
"{state.prompt}"

Each item should include a short source-style attribution.
"""
    return {"research_notes": generate_research(prompt, 512)}


def draft_blog(state: BlogState) -> Dict[str, Any]:
    """Step 3: Generate the main blog draft aligned with brand voice and history."""
    medium_word_count = state.modalities.get("medium", 600)

    prompt = f"""
You are a Senior Brand Copywriter.

Write a {medium_word_count}-word blog post about:
"{state.prompt}"

Brand: {state.brand_name}
Tone: {state.tone}
Audience: {state.audience}

Brand Voice:
{state.brand_voice}

Brand History:
{state.brand_history}

Research Insights:
{state.research_notes}

Guidelines:
- Keep the writing aligned with the brand’s history and ethics.
- Use Markdown formatting with headings.
- Structure: Introduction, 3 core sections, and a conclusion.
"""
    return {"blog_draft": generate(prompt, 1024)}


def compliance_review(state: BlogState) -> Dict[str, Any]:
    """Step 4: Check compliance for tone, factual accuracy, and brand alignment."""
    prompt = f"""
You are the Brand Compliance Reviewer.

Check the following blog for:
- Accuracy of claims
- Brand alignment with {state.brand_name}'s tone
- Ethical and factual soundness
- Readability for {state.audience}

Blog:
{state.blog_draft}

Return a report (in plain English) that includes:
- Verdict: APPROVED or REVISION_NEEDED
- Key observations
- If revisions needed, list what to improve
"""
    return {"compliance_report": generate(prompt, 512)}


def revision_step(state: BlogState) -> Dict[str, Any]:
    """Step 5: Revise the blog if compliance suggests improvement."""
    if not state.compliance_report or "APPROVED" in state.compliance_report.upper():
        return {"revision_notes": "No revision required."}

    prompt = f"""
You are an Editor revising a blog based on compliance feedback.

Original Blog:
{state.blog_draft}

Compliance Feedback:
{state.compliance_report}

Task:
Revise the blog to address the feedback while preserving the brand voice.
"""
    return {
        "revision_notes": generate(prompt, 512),
        "revision_count": state.revision_count + 1,
        "blog_draft": generate(prompt, 1024)
    }


def repurpose_social_assets(state: BlogState) -> Dict[str, Any]:
    """Generate social media versions per selected modality."""
    if not state.modalities:
        return {"social_assets": {}}

    assets = {}
    for platform, word_count in state.modalities.items():
        prompt = f"""
You are a Social Media Strategist.

Based on the following blog:
{state.blog_draft}

Create a post for **{platform}** (~{word_count} words) that:
- Matches {platform}'s style and tone
- Is consistent with the brand's values and history
- Feels native to that platform
"""
        generated_text = generate(prompt, 512)
        # Key is modality name, value is generated text
        assets[platform] = generated_text

    # Optional: format as a single string to display in frontend
    formatted_output = "\n\n".join(
        f"### {modality}\n{text}" for modality, text in assets.items()
    )

    return {"social_assets": assets, "formatted_social_output": formatted_output}



def finalize_package(state: BlogState) -> Dict[str, Any]:
    """Final step – summarize completion."""
    return {"response": "✅ Blog workflow completed successfully with compliance review and social assets."}


# -------------------------------
# Build the Graph
# -------------------------------
def build_blog_graph() -> StateGraph:
    graph = StateGraph(BlogState)

    graph.add_node("brand_context_research", brand_context_research)
    graph.add_node("topic_research", topic_research)
    graph.add_node("draft_blog", draft_blog)
    graph.add_node("compliance_review", compliance_review)
    graph.add_node("revision_step", revision_step)
    graph.add_node("repurpose_social_assets", repurpose_social_assets)
    graph.add_node("finalize_package", finalize_package)

    graph.add_edge(START, "brand_context_research")
    graph.add_edge("brand_context_research", "topic_research")
    graph.add_edge("topic_research", "draft_blog")
    graph.add_edge("draft_blog", "compliance_review")
    graph.add_edge("compliance_review", "revision_step")
    graph.add_edge("revision_step", "repurpose_social_assets")
    graph.add_edge("repurpose_social_assets", "finalize_package")
    graph.add_edge("finalize_package", END)

    return graph


