"""
Newsroom agent that researches a topic and spins up modality-specific assets.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Type

from config.settings import settings
from core.base_agent import BaseAgent
from core.state import InputState, NewsroomState, OutputState
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph


class NewsroomAgent(BaseAgent):
    """Multi-agent inspired workflow for news research + multi-channel drafting."""

    def __init__(self, **kwargs: Any):
        super().__init__(
            name="NewsroomAgent",
            system_prompt=self._system_prompt(),
            **kwargs,
        )
        self.default_modalities = ["news_article", "medium", "linkedin"]
        self.modality_recipes = self._build_modality_recipes()
        self._bootstrap_tavily()
        self.search_tool = TavilySearchResults(max_results=settings.SEARCH_MAX_RESULTS)

    def _bootstrap_tavily(self) -> None:
        """Ensure Tavily API key is available to the search tool."""
        tavily_key = settings.get_tavily_key()
        if tavily_key and not os.environ.get("TAVILY_API_KEY"):
            os.environ["TAVILY_API_KEY"] = tavily_key

    def _build_modality_recipes(self) -> Dict[str, Dict[str, str]]:
        """Return modality-specific instructions."""
        return {
            "news_article": {
                "label": "News Article",
                "persona": "Newsroom_Writer",
                "template": (
                    "Write a 450-600 word news article using an inverted pyramid. "
                    "Lead with the freshest fact, follow with 2 supporting sections, "
                    "add a breakout quote, and close with 'What happens next'. "
                    "Cite sources inline using [S#] markers."
                ),
                "example": (
                    "Example:\n"
                    "Headline: Edge AI Chips Hit Record Funding in Q4\n"
                    "Lead: Funding for edge inference silicon reached $2.1B [S1] as "
                    "automakers and telcos rushed bespoke accelerators.\n"
                    "Body: ...\n"
                    "Breakout Quote: “Edge silicon is finally sexy,” said CTO A. Rivera.\n"
                    "Next: Watch for regulatory scrutiny on export controls."
                ),
            },
            "medium": {
                "label": "Medium Essay",
                "persona": "Medium_Commentator",
                "template": (
                    "Deliver a 450-word Medium-style analysis with a personal POV, "
                    "a hook paragraph, 3 short sections with H3 headers, and a reflective close. "
                    "Blend reported facts [S#] with a clear stance."
                ),
                "example": (
                    "Example:\n"
                    "## Hook\n"
                    "I spent the week combing through grid-intertie filings, and here's what nobody says aloud...\n"
                    "### Section 1 – The Signal\n"
                    "Walk readers through the data point.\n"
                    "### Section 2 – The Stakes\n"
                    "Explain who wins/loses and why it matters.\n"
                    "### Section 3 – The Move\n"
                    "Offer pragmatic advice.\n"
                    "Final paragraph invites comments."
                ),
            },
            "linkedin": {
                "label": "LinkedIn Post",
                "persona": "Social_Editor",
                "template": (
                    "Create a 180-220 word LinkedIn post. Start with a hook emoji, "
                    "share 2 bullet takeaways with [S#] receipts, include a one-line POV, "
                    "and finish with a CTA question + three hashtags."
                ),
                "example": (
                    "Example:\n"
                    "🚨 The grid just got a software upgrade.\n"
                    "• Utilities deploying AI dispatching cut outages 18% [S1]\n"
                    "• Regulators now fast-track virtual power plants [S2]\n"
                    "My take: The winners pair ops engineers with data scientists.\n"
                    "What would you retrofit first?\n"
                    "#energy #ai #operations"
                ),
            },
        }

    def _system_prompt(self) -> str:
        return (
            "You coordinate a newsroom pod (research analyst + fact-checker + channel editors). "
            "Always ground claims in sourced facts and adapt tone per channel."
        )

    def get_state_schema(self) -> Type:
        return NewsroomState

    def build_graph(self) -> StateGraph:
        workflow = StateGraph(
            NewsroomState,
            input=InputState,
            output=OutputState,
        )

        workflow.add_node("ingest_brief", self.ingest_brief)
        workflow.add_node("research_topic", self.research_topic)
        workflow.add_node("generate_outline", self.generate_outline)
        workflow.add_node("draft_modalities", self.draft_modalities)
        workflow.add_node("finalize_package", self.finalize_package)

        workflow.add_edge(START, "ingest_brief")
        workflow.add_edge("ingest_brief", "research_topic")
        workflow.add_edge("research_topic", "generate_outline")
        workflow.add_edge("generate_outline", "draft_modalities")
        workflow.add_edge("draft_modalities", "finalize_package")
        workflow.add_edge("finalize_package", END)

        return workflow

    def ingest_brief(
        self, state: NewsroomState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Normalize inputs and identify modalities."""
        messages = state.get("messages", [])
        brief = state.get("brief") or (messages[-1].content if messages else "")
        topic = state.get("topic") or brief.split(".")[0].strip()
        tone = state.get("tone") or "confident and factual"
        audience = state.get("audience") or "busy operators and executives"
        timeframe = state.get("timeframe") or "last 72 hours"

        requested_modalities = state.get("modalities") or self.default_modalities
        normalized_modalities = [
            m for m in requested_modalities if m in self.modality_recipes
        ]
        if not normalized_modalities:
            normalized_modalities = ["news_article"]

        research_queries = [
            f"latest updates on {topic} {timeframe}",
            f"{topic} market impact news",
            f"{topic} expert analysis {timeframe}",
        ]

        return {
            "brief": brief,
            "topic": topic,
            "tone": tone,
            "audience": audience,
            "timeframe": timeframe,
            "modalities": normalized_modalities,
            "research_queries": research_queries,
            "metadata": {
                **state.get("metadata", {}),
                "modalities": normalized_modalities,
            },
        }

    def research_topic(
        self, state: NewsroomState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Use Tavily to collect fresh references and summarize them."""
        queries = state.get("research_queries", [])
        all_hits: List[Dict[str, Any]] = []
        for query in queries:
            try:
                result = self.search_tool.invoke({"query": query})
            except Exception as exc:  # pragma: no cover - network failure fallback
                self.logger.warning(f"Tavily search failed for '{query}': {exc}")
                result = []

            if isinstance(result, dict) and "results" in result:
                result = result["results"]

            if isinstance(result, list):
                all_hits.extend(result)

        formatted_sources = []
        for idx, hit in enumerate(all_hits[: settings.SEARCH_MAX_RESULTS * 2], start=1):
            title = hit.get("title") or hit.get("url") or f"Source {idx}"
            snippet = hit.get("content") or hit.get("snippet") or ""
            url = hit.get("url", "")
            formatted_sources.append(f"[S{idx}] {title}\n{snippet}\nURL: {url}")

        if not formatted_sources:
            formatted_sources.append(
                "[S1] No live search results. Rely on general knowledge but flag speculation."
            )

        synthesis_prompt = f"""You are the Research_Analyst.
Digest the sourced snippets below into 4 bullet findings with [S#] references
and call out any contradictory signals.

Sources:
{chr(10).join(formatted_sources)}
"""
        synthesis = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=synthesis_prompt),
            ]
        )

        return {
            "research_digest": synthesis.content,
            "metadata": {
                **state.get("metadata", {}),
                "sources": formatted_sources,
            },
        }

    def generate_outline(
        self, state: NewsroomState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Translate research into an outline."""
        outline_prompt = f"""You are the Planning_Editor.
Create a crisp outline for a news explainer on '{state.get('topic')}'.
Use the research digest verbatim where possible and identify hook, context,
implications, and forward look sections.

Research Digest:
{state.get('research_digest','')}
"""
        outline = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=outline_prompt),
            ]
        )

        return {
            "outline": outline.content,
            "metadata": {
                **state.get("metadata", {}),
                "outline_ready": True,
            },
        }

    def draft_modalities(
        self, state: NewsroomState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Generate assets per modality with tailored prompts."""
        assets: Dict[str, str] = {}
        for modality in state.get("modalities", []):
            recipe = self.modality_recipes[modality]
            drafting_prompt = f"""Role: {recipe['persona']}
Brief: {state.get('brief')}
Topic: {state.get('topic')}
Audience: {state.get('audience')}
Tone: {state.get('tone')}
Research Findings:
{state.get('research_digest','')}

Approved Outline:
{state.get('outline','')}

Modality Instructions:
{recipe['template']}

Reference Example:
{recipe['example']}

Deliver the final {recipe['label']} now. Maintain [S#] markers when citing.
"""
            response = self.model.invoke(
                [
                    SystemMessage(content=self.system_prompt),
                    HumanMessage(content=drafting_prompt),
                ]
            )
            assets[modality] = response.content

        return {
            "assets": assets,
            "metadata": {
                **state.get("metadata", {}),
                "modalities_completed": list(assets.keys()),
            },
        }

    def finalize_package(
        self, state: NewsroomState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Bundle research + assets for downstream consumers."""
        package = {
            "topic": state.get("topic"),
            "brief": state.get("brief"),
            "research_digest": state.get("research_digest"),
            "outline": state.get("outline"),
            "sources": state.get("metadata", {}).get("sources", []),
            "assets": state.get("assets", {}),
        }
        produced = ", ".join(package["assets"].keys()) or "no assets"
        summary = f"📰 Newsroom package ready with {produced}."

        return {
            "messages": [AIMessage(content=summary)],
            "response": summary,
            "metadata": {"package": package, "handler": "newsroom"},
            "package": package,
        }

