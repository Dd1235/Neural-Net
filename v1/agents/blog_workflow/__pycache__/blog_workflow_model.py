"""
Blog workflow graph using open-source LLMs via Hugging Face pipelines.

- Fully open-source setup (no OpenAI dependency)
- Each node uses the same local model for simplicity
- Compatible with LangGraph

Requires:
    pip install langgraph transformers torch accelerate
Optional for faster inference:
    pip install bitsandbytes

Example models:
    - mistralai/Mistral-7B-Instruct-v0.2
    - meta-llama/Llama-2-7b-chat-hf
    - databricks/dolly-v2-3b
    - google/flan-t5-large
"""

from typing import Dict, Any, Type
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from transformers import pipeline


# -------------------------------
# State Schema
# -------------------------------
class BlogState(BaseModel):
    messages: list = Field(default_factory=list)
    topic: str = "The Future of Remote Work"
    brief: str = ""
    word_count: int = 1000
    tone: str = "pragmatic"
    audience: str = "business decision makers"
    plan: str = None
    research_notes: str = None
    draft: str = None
    compliance_report: str = None
    revision_notes: str = None
    social_assets: str = None
    hero_prompt: str = None
    revision_count: int = 0


# -------------------------------
# Base Local Model (Open-source)
# -------------------------------
model_name = "mistralai/Mistral-7B-Instruct-v0.2"  # pick any open model you’ve downloaded or can access
llm = pipeline("text-generation", model=model_name, torch_dtype="auto", device_map="auto")


def generate(prompt: str, max_tokens=512) -> str:
    out = llm(prompt, max_new_tokens=max_tokens, do_sample=True, temperature=0.7)
    return out[0]["generated_text"]


# -------------------------------
# Node Implementations
# -------------------------------
def project_plan(state: BlogState) -> Dict[str, Any]:
    prompt = f"""You are a Project Manager. Based on the topic, create a 4-step blog production plan.
Topic: {state.topic}
Tone: {state.tone}
Audience: {state.audience}
Word count: {state.word_count}
Brief: {state.brief}
"""
    plan = generate(prompt, 256)
    return {"plan": plan}


def strategy_research(state: BlogState) -> Dict[str, Any]:
    prompt = f"""You are a Research Strategist. List 3-4 credible findings or stats about {state.topic}.
Each should include short source-style attributions."""
    notes = generate(prompt, 256)
    return {"research_notes": notes}


def draft_blog(state: BlogState) -> Dict[str, Any]:
    prompt = f"""You are a Copywriter. Write a ~{state.word_count}-word blog on the topic '{state.topic}'.
Tone: {state.tone}
Audience: {state.audience}
Include the following research:
{state.research_notes}
Format in Markdown with introduction, body (3 sections), and conclusion."""
    draft = generate(prompt, 512)
    return {"draft": draft}


def compliance_review(state: BlogState) -> Dict[str, Any]:
    prompt = f"""You are the Compliance Reviewer (brand + legal + factual accuracy).
Review the following blog and return JSON with keys:
status (approve or revise), notes, flagged_sections.
Blog draft:
{state.draft}
"""
    report = generate(prompt, 256)
    return {"compliance_report": report}


def editor_feedback(state: BlogState) -> Dict[str, Any]:
    prompt = f"""You are an Editor. Summarize the compliance concerns and write revision notes for the writer.
Compliance report:
{state.compliance_report}
"""
    feedback = generate(prompt, 256)
    return {"revision_notes": feedback, "revision_count": state.revision_count + 1}


def repurpose_assets(state: BlogState) -> Dict[str, Any]:
    prompt = f"""You are a Social Media Strategist. From this blog, generate:
1. Three tweets highlighting different key ideas.
2. One LinkedIn post summary (<= 4 paragraphs).
3. A one-sentence hero image prompt.
Blog:
{state.draft}
"""
    assets = generate(prompt, 256)
    return {"social_assets": assets, "hero_prompt": "A futuristic workspace with holographic meeting displays."}


def finalize_package(state: BlogState) -> Dict[str, Any]:
    summary = "✅ Blog package ready: includes plan, research, draft, compliance, social assets."
    return {"response": summary}


# -------------------------------
# Conditional routing
# -------------------------------
def route_after_compliance(state: BlogState) -> str:
    text = (state.compliance_report or "").lower()
    if "revise" in text or "flag" in text:
        return "editor_feedback"
    return "repurpose_assets"


# -------------------------------
# Build the workflow graph
# -------------------------------
def build_blog_graph() -> StateGraph:
    graph = StateGraph(BlogState)

    graph.add_node("project_plan", project_plan)
    graph.add_node("strategy_research", strategy_research)
    graph.add_node("draft_blog", draft_blog)
    graph.add_node("compliance_review", compliance_review)
    graph.add_node("editor_feedback", editor_feedback)
    graph.add_node("repurpose_assets", repurpose_assets)
    graph.add_node("finalize_package", finalize_package)

    graph.add_edge(START, "project_plan")
    graph.add_edge("project_plan", "strategy_research")
    graph.add_edge("strategy_research", "draft_blog")
    graph.add_edge("draft_blog", "compliance_review")

    graph.add_conditional_edges(
        "compliance_review",
        route_after_compliance,
        {
            "editor_feedback": "draft_blog",
            "repurpose_assets": "repurpose_assets",
        },
    )

    graph.add_edge("repurpose_assets", "finalize_package")
    graph.add_edge("finalize_package", END)

    return graph


# -------------------------------
# Example run (for testing)
# -------------------------------
if __name__ == "__main__":
    graph = build_blog_graph()
    state = BlogState(topic="AI in Education", brief="Discuss how AI tools enhance learning.")
    result = graph.invoke(state)
    print("\n--- FINAL OUTPUT ---")
    print(result)
