"""
Blog post workflow agent modeled after walkthrough instructions.
"""

from typing import Any, Dict, Type

from core.base_agent import BaseAgent
from core.state import BlogWorkflowState, InputState, OutputState
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph


class BlogWorkflowAgent(BaseAgent):
    """Supervisor agent coordinating blog plan -> research -> draft -> compliance -> social."""

    def __init__(self, **kwargs):
        super().__init__(
            name="BlogWorkflowAgent",
            system_prompt=self._system_prompt(),
            **kwargs,
        )

    def _system_prompt(self) -> str:
        return (
            "You orchestrate a content studio with project manager, strategist, copywriter, compliance trio, "
            "editor, and repurposing team. Follow the walkthrough for multi asset blog delivery."
        )

    def get_state_schema(self) -> Type:
        return BlogWorkflowState

    def build_graph(self) -> StateGraph:
        workflow = StateGraph(BlogWorkflowState, input=InputState, output=OutputState)

        workflow.add_node("project_plan", self.project_plan)
        workflow.add_node("strategy_research", self.strategy_research)
        workflow.add_node("draft_blog", self.draft_blog)
        workflow.add_node("compliance_review", self.compliance_review)
        workflow.add_node("editor_feedback", self.editor_feedback)
        workflow.add_node("repurpose_assets", self.repurpose_assets)
        workflow.add_node("finalize_package", self.finalize_package)

        workflow.add_edge(START, "project_plan")
        workflow.add_edge("project_plan", "strategy_research")
        workflow.add_edge("strategy_research", "draft_blog")
        workflow.add_edge("draft_blog", "compliance_review")

        workflow.add_conditional_edges(
            "compliance_review",
            self._compliance_route,
            {
                "revise": "editor_feedback",
                "approve": "repurpose_assets",
            },
        )

        workflow.add_edge("editor_feedback", "draft_blog")
        workflow.add_edge("repurpose_assets", "finalize_package")
        workflow.add_edge("finalize_package", END)

        return workflow

    # Nodes
    def project_plan(
        self, state: BlogWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        messages = state["messages"]
        brief = state.get("brief") or (messages[-1].content if messages else "")
        topic = state.get("topic") or "The Future of Remote Work"
        word_count = state.get("word_count") or 1000
        tone = state.get("tone") or "forward-looking and pragmatic"
        audience = state.get("audience") or "business decision makers"

        plan_prompt = f"""You are the Project_Manager_Agent.
            Based on the brief, outline a four step plan exactly like the walkthrough.
            Topic: {topic}
            Word count target: {word_count}
            Tone: {tone}
            Audience: {audience}
            Brief: {brief}
            """

        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=plan_prompt),
            ]
        )

        return {
            "brief": brief,
            "topic": topic,
            "word_count": word_count,
            "tone": tone,
            "audience": audience,
            "plan": response.content.split("\n"),
            "revision_count": state.get("revision_count", 0),
            "needs_revision": state.get("needs_revision", False),
        }

    def strategy_research(
        self, state: BlogWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        research_prompt = f"""You are the Strategy_Agent.
            Summarize 3-4 credible findings/stats about {state['topic']}.
            Include data points with source-style attribution.
            """
        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=research_prompt),
            ]
        )

        return {
            "research_notes": response.content,
        }

    def draft_blog(
        self, state: BlogWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        revision_notes = state.get("revision_notes")
        instructions = """- 1000 words ±10%
            - Conversational yet authoritative tone
            - Include intro, 3 body sections, conclusion with CTA
            - Weave in provided research stats
            - Markdown format"""
        if revision_notes:
            instructions += f"\n- Address revision notes: {revision_notes}"

        draft_prompt = f"""You are the Copywriter_Agent.
            Write the blog per instructions.
            Topic: {state['topic']}
            Audience: {state['audience']}
            Tone: {state['tone']}
            Research:
            {state.get('research_notes','')}
            Instructions:
            {instructions}
            """

        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=draft_prompt),
            ]
        )

        return {
            "draft": response.content,
            "needs_revision": False,
            "revision_notes": None,
        }

    def compliance_review(
        self, state: BlogWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        draft = state.get("draft", "")
        compliance_prompt = f"""You are the Compliance_Trio (Brand, Legal, Copyright).
        Review the draft below. If there is an unverified stat, flag it with guidance.
        Respond in JSON with keys: status (approve|revise), notes, flagged_section.
        Draft:
        {draft}
        """
        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=compliance_prompt),
            ]
        )

        return {
            "compliance_report": {"raw": response.content},
        }

    def _compliance_route(self, state: BlogWorkflowState) -> str:
        report = state.get("compliance_report", {})
        content = (report.get("raw", "") or "").lower()
        revision_count = state.get("revision_count", 0)
        needs_revision = "revise" in content or "flag" in content
        if needs_revision and revision_count < 1:
            return "revise"
        return "approve"

    def editor_feedback(
        self, state: BlogWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        report = state.get("compliance_report", {}).get("raw", "")
        feedback_prompt = f"""You are the Editor_Agent.
        Summarize the compliance concerns and craft revision notes for the copywriter.
        Compliance report:
        {report}
        """
        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=feedback_prompt),
            ]
        )

        return {
            "needs_revision": True,
            "revision_notes": response.content,
            "revision_count": state.get("revision_count", 0) + 1,
        }

    def repurpose_assets(
        self, state: BlogWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        draft = state.get("draft", "")
        social_prompt = f"""You are the Repurposing_Agent.
        Produce assets:
        1. Three tweets highlighting different angles (numbered).
        2. One LinkedIn post summary (<= 4 paragraphs).
        3. Hero image prompt suggestion in one sentence.
        Use the final blog draft below:
        {draft}
        """
        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=social_prompt),
            ]
        )

        return {
            "social_assets": {"content": response.content},
            "hero_prompt": "a high-tech, sunlit home office with a holographic-style virtual meeting",
        }

    def finalize_package(
        self, state: BlogWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        package = {
            "plan": state.get("plan"),
            "research_notes": state.get("research_notes"),
            "blog_post": state.get("draft"),
            "social_assets": state.get("social_assets", {}),
            "hero_prompt": state.get("hero_prompt"),
            "compliance_report": state.get("compliance_report"),
            "revision_count": state.get("revision_count", 0),
        }

        summary = "🧩 Blog content package ready. Includes plan, research notes, ~1000-word blog, social snippets, hero prompt, and compliance record."

        return {
            "messages": [AIMessage(content=summary)],
            "response": summary,
            "metadata": {"package": package, "handler": "blog_workflow"},
            "package": package,
        }
