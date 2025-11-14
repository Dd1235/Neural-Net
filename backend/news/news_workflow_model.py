from typing import Dict, Any
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field
from groq import Groq
from langchain_community.tools.tavily_search import TavilySearchResults
from dotenv import load_dotenv
import os

load_dotenv()

# -------------------------------
# Initialize Groq client
# -------------------------------
client = Groq()  # Uses GROQ_API_KEY from environment
research_client = Groq()  # Smaller agent for research (llama-3.1-8b-instant)

# --- Initialize Tavily Search Tool ---
if not os.environ.get("TAVILY_API_KEY"):
    print("WARN: TAVILY_API_KEY not set. Web research will fail.")
search_tool = TavilySearchResults(max_results=5)

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
    """Use Groq API (fast model) for research."""
    # This is now a fallback, but we keep it
    completion = research_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=1,
        stream=False,
    )
    return completion.choices[0].message.content.strip()

# -------------------------------
# State Schema
# -------------------------------
class NewsArticleState(BaseModel):
    # 🧠 Input from frontend
    prompt: str = ""
    tone: str = ""
    audience: str = ""
    additional_context: str = ""
    word_count: int = 800

    # 🔄 Workflow-generated fields
    research_notes: str | None = None # This will now be filled by Tavily
    article_draft: str | None = None
    compliance_report: str | None = None
    revision_count: int = 0
    final_response: str | None = None


# -------------------------------
# Nodes
# -------------------------------

def topic_research(state: NewsArticleState) -> Dict[str, Any]:
    """Step 1: Research the topic using Tavily web search."""
    print("--- RESEARCHING TOPIC (TAVILY) ---")
    prompt = state.prompt
    
    try:
        # Use the prompt to search the web
        results = search_tool.invoke(prompt)
        
        # Format the results into a clean string
        formatted_sources = []
        for idx, hit in enumerate(results, start=1):
            title = hit.get("title", "")
            snippet = hit.get("content", "")
            url = hit.get("url", "")
            
            # Create a [S#] style reference
            formatted_sources.append(
                f"[S{idx}] {title}\n"
                f"Snippet: {snippet}\n"
                f"URL: {url}"
            )
        
        research_summary = "\n\n".join(formatted_sources)
        if not research_summary:
            research_summary = "No web search results found. Relying on internal knowledge."
        print(research_summary)
            
        return {"research_notes": research_summary}
        
    except Exception as e:
        print(f"Error in Tavily search: {e}")
        # Fallback in case of error
        return {"research_notes": "Web research failed. Relying on internal knowledge."}


def draft_article(state: NewsArticleState) -> Dict[str, Any]:
    """Step 2: Generate the main news article, using web research."""
    print("--- DRAFTING ARTICLE ---")
    
    # Prompt is updated to instruct the LLM to use the new research
    prompt = f"""
You are an objective News Reporter.

Write a {state.word_count}-word news article about:
"{state.prompt}"

Tone: {state.tone}
Audience: {state.audience}

*** USE THE FOLLOWING WEB RESEARCH AS YOUR PRIMARY SOURCE OF FACTS. ***
*** CITE SOURCES INLINE USING THE [S#] MARKERS. ***

Key Research Findings:
{state.research_notes}

Additional Context / Existing Draft (if any):
{state.additional_context}

Guidelines:
- Write in an objective, journalistic style (e.g., AP style).
- CITE FACTS using the [S#] markers from the research.
- Use Markdown for formatting (headings, lists).
- Structure:
  1. Headline (H1)
  2. Lede (A 1-2 sentence summary)
  3. Body (Develop the story, citing sources)
  4. Conclusion (Summarize or provide outlook)
"""
    return {"article_draft": generate(prompt, 1500)}


def compliance_review(state: NewsArticleState) -> Dict[str, Any]:
    """Step 3: Review the draft for accuracy and tone."""
    print("--- REVIEWING DRAFT ---")
    prompt = f"""
You are a meticulous Copy Editor.

Review the following news article for:
- Factual accuracy (check against the research)
- Journalistic objectivity (ensure the tone is not overly biased)
- Clarity and readability for the target {state.audience}
- **Crucially: Ensure [S#] citations are used for claims from the research.**

Article Draft:
{state.article_draft}

Research Insights:
{state.research_notes}

Task:
Return a report (in plain English) with two sections:
1. Verdict: Must be one of - APPROVED or REVISION_NEEDED
2. Observations: If REVISION_NEEDED, provide a bulleted list of specific changes. If APPROVED, say "No issues."
"""
    return {"compliance_report": generate_research(prompt, 512)} # Use fast model for review


def revision_step(state: NewsArticleState) -> Dict[str, Any]:
    """Step 4 (if needed): Revise the article based on feedback."""
    print("--- REVISING DRAFT ---")
    
    prompt = f"""
You are a Journalist revising an article based on your editor's feedback.

Original Article:
{state.article_draft}

Editor's Feedback:
{state.compliance_report}

Task:
Rewrite the full article to address all points in the feedback.
Ensure the new draft is {state.word_count} words, maintains the {state.tone} tone, and properly CITES the original research.

Original Research (for reference):
{state.research_notes}
"""
    # Overwrite the old draft with the new, revised version
    return {
        "article_draft": generate(prompt, 1500),
        "revision_count": state.revision_count + 1,
    }


def finalize_package(state: NewsArticleState) -> Dict[str, Any]:
    """Final step – wrap up."""
    print("--- FINALIZING ---")
    return {"final_response": "✅ News article workflow completed."}

# -------------------------------
# Conditional Edges
# -------------------------------

def should_revise(state: NewsArticleState) -> str:
    """Check the compliance report for a verdict."""
    
    # Safety check for max revisions to avoid infinite loops
    if state.revision_count >= 2:
        print("Max revisions reached. Finalizing.")
        return "finalize"
    
    if "REVISION_NEEDED" in state.compliance_report.upper():
        print("Compliance check failed. Routing to revision.")
        return "revise"
    else:
        print("Compliance check APPROVED. Routing to finalize.")
        return "finalize"

# -------------------------------
# Build the Graph
# -------------------------------
def build_news_article_graph() -> StateGraph:
    """Builds the LangGraph workflow for generating a news article."""
    
    graph = StateGraph(NewsArticleState)

    # Add nodes
    graph.add_node("topic_research", topic_research)
    graph.add_node("draft_article", draft_article)
    graph.add_node("compliance_review", compliance_review)
    graph.add_node("revision_step", revision_step)
    graph.add_node("finalize_package", finalize_package)

    # Define the graph flow
    graph.add_edge(START, "topic_research")
    graph.add_edge("topic_research", "draft_article")
    graph.add_edge("draft_article", "compliance_review")

    # Add the conditional review loop
    graph.add_conditional_edges(
        "compliance_review",
        should_revise,
        {
            "revise": "revision_step",
            "finalize": "finalize_package"
        }
    )
    
    # The revision step loops back to compliance for a re-check
    graph.add_edge("revision_step", "compliance_review")
    
    # The finalize step ends the graph
    graph.add_edge("finalize_package", END)

    return graph