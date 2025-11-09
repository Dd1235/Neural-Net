"""
Content creation workflow agent that mirrors the walkthrough multi-agent plan.
"""

from typing import Any, Dict, List, Type

from core.base_agent import BaseAgent
from core.state import ContentIntent, ContentWorkflowState, InputState, OutputState
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph


class ContentCreationAgent(BaseAgent):
    """
    Multi-step content workflow that:
    1. Classifies the brief into blog/newsletter needs
    2. Produces an outline
    3. Drafts the primary asset
    4. Generates derivative channel assets (LinkedIn, newsletter snippets, Instagram, etc.)
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="ContentCreationAgent",
            system_prompt=self._system_prompt(),
            **kwargs,
        )
        self.intent_classifier = self.model.with_structured_output(ContentIntent)
        self.default_channels = ["linkedin", "instagram"]
        self.channel_guidelines = {
            "linkedin": (
                "Write a LinkedIn-ready post under 1,800 characters. "
                "Hook with a bold statement, add 2 short paragraphs, include a CTA asking for comments, "
                "and finish with 3 industry hashtags."
            ),
            "newsletter": (
                "Create a 200-word digest section containing a punchy subject line, "
                "40-character preview text, and 2 short paragraphs with a CTA button copy."
            ),
            "instagram": (
                "Craft an Instagram caption with line breaks, 2 emojis, and a call-to-action. "
                "Conclude with three short branded hashtags."
            ),
            "twitter": (
                "Provide two tweet options, each under 240 characters, high-energy and urgent when relevant."
            ),
            "threads": (
                "Write a single Threads post, conversational tone, ending with a question to drive replies."
            ),
        }

    def _system_prompt(self) -> str:
        """Describe the multi-agent workflow per the walkthrough."""
        return """You orchestrate a lightweight content studio that mirrors a project manager, strategist,
        copywriter, compliance trio, and repurposing agent.
        - Break briefs into plans
        - Produce outlines before drafting
        - Deliver a polished primary asset plus channel-specific derivatives
        Maintain brand voice, cite stats only if provided, and flag any unclear claims."""

    def get_state_schema(self) -> Type:
        return ContentWorkflowState

    def build_graph(self) -> StateGraph:
        workflow = StateGraph(
            ContentWorkflowState,
            input=InputState,
            output=OutputState,
        )

        workflow.add_node("gather_brief", self.gather_brief)
        workflow.add_node("classify_request", self.classify_request)
        workflow.add_node("generate_outline", self.generate_outline)
        workflow.add_node("create_primary_asset", self.create_primary_asset)
        workflow.add_node("build_channel_assets", self.build_channel_assets)
        workflow.add_node("finalize_package", self.finalize_package)

        workflow.add_edge(START, "gather_brief")
        workflow.add_edge("gather_brief", "classify_request")
        workflow.add_edge("classify_request", "generate_outline")
        workflow.add_edge("generate_outline", "create_primary_asset")
        workflow.add_edge("create_primary_asset", "build_channel_assets")
        workflow.add_edge("build_channel_assets", "finalize_package")
        workflow.add_edge("finalize_package", END)

        return workflow

    def gather_brief(
        self, state: ContentWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Normalize the brief and preferences."""
        messages = state["messages"]
        brief = state.get("brief") or (messages[-1].content if messages else "")
        tone = state.get("tone") or "confident and friendly"
        audience = state.get("audience") or "busy professionals"
        word_count = state.get("word_count") or (
            1000 if state.get("primary_asset") == "blog" else 400
        )

        return {
            "brief": brief,
            "tone": tone,
            "audience": audience,
            "word_count": word_count,
            "metadata": {
                **state.get("metadata", {}),
                "ingested": True,
            },
        }

    def classify_request(
        self, state: ContentWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Decide which primary asset and channels to produce."""
        primary_asset = state.get("primary_asset")
        secondary = state.get("secondary_channels") or []
        brief = state.get("brief", "")
        word_count = state.get("word_count")

        needs_classification = primary_asset not in {"blog", "newsletter"}

        if needs_classification or not secondary:
            classification_prompt = f"""Classify this marketing brief. Pick the best long-form asset
between 'blog' or 'newsletter' and list 2-3 supporting channels (linkedin, instagram, newsletter,
twitter, threads). Brief: {brief}"""
            classification = self.intent_classifier.invoke(
                [SystemMessage(content=classification_prompt)]
            )
            if needs_classification:
                primary_asset = classification.primary_asset
            if not secondary:
                secondary = (
                    list(dict.fromkeys(classification.channels))
                    or self.default_channels
                )

        normalized_channels = self._sanitize_channels(secondary, primary_asset)
        if not word_count:
            word_count = 1000 if (primary_asset or "blog") == "blog" else 400

        return {
            "primary_asset": primary_asset or "blog",
            "secondary_channels": normalized_channels,
            "word_count": word_count,
            "metadata": {
                **state.get("metadata", {}),
                "classification": {
                    "primary_asset": primary_asset or "blog",
                    "channels": normalized_channels,
                },
            },
        }

    def generate_outline(
        self, state: ContentWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Produce a structured outline before drafting."""
        primary_asset = state.get("primary_asset", "blog")
        brief = state.get("brief", "")
        tone = state.get("tone")
        audience = state.get("audience")
        word_count = state.get("word_count")

        outline_prompt = f"""You are the Strategy_Agent. Build a structured outline for a {primary_asset}.
        Brief: {brief}
        Audience: {audience}
        Tone: {tone}
        Target length: {word_count} words.

        Include:
        - Hook
        - Key sections with H2/H3 labels
        - Bullet notes per section
        - CTA idea
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
                "outline_generated": True,
            },
        }

    def create_primary_asset(
        self, state: ContentWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Draft the blog or newsletter using the outline."""
        primary_asset = state.get("primary_asset", "blog")
        outline = state.get("outline", "")
        brief = state.get("brief", "")
        tone = state.get("tone")
        audience = state.get("audience")
        word_count = state.get("word_count")

        if primary_asset == "newsletter":
            asset_prompt = f"""You are the Copywriter_Agent. Turn the outline into a newsletter.
        Requirements:
        - Subject line (<50 characters) + preview text (<80 characters)
        - Opening hook paragraph
        - 2-3 short sections with subheadings
        - Skimmable bullets
        - CTA button copy
        Brief: {brief}
        Audience: {audience}
        Tone: {tone}
        Outline:
        {outline}
        """
        else:
            asset_prompt = f"""You are the Copywriter_Agent. Turn the outline into a blog post.
            Requirements:
            - {word_count} words ±15%
            - Conversational yet authoritative tone
            - Include pull-quote block and a numbered list
            - Close with a CTA paragraph
            Brief: {brief}
            Audience: {audience}
            Tone: {tone}
            Outline:
            {outline}
            """

        primary_content = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=asset_prompt),
            ]
        )

        return {
            "primary_content": primary_content.content,
            "metadata": {
                **state.get("metadata", {}),
                "primary_asset_created": True,
            },
        }

    def build_channel_assets(
        self, state: ContentWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Repurpose the primary asset for requested channels."""
        channels = state.get("secondary_channels", [])
        primary_asset = state.get("primary_asset", "blog")
        primary_content = state.get("primary_content", "")
        brief = state.get("brief", "")

        channel_packages: Dict[str, str] = {}

        for channel in channels:
            prompt = self._channel_prompt(channel, primary_asset, brief)
            response = self.model.invoke(
                [
                    SystemMessage(content=self.system_prompt),
                    HumanMessage(
                        content=f"""{prompt}

Primary asset:
{primary_content}
"""
                    ),
                ]
            )
            channel_packages[channel] = response.content

        return {
            "channel_packages": channel_packages,
            "metadata": {
                **state.get("metadata", {}),
                "channels_completed": channels,
            },
        }

    def finalize_package(
        self, state: ContentWorkflowState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Return a summary plus the packaged assets."""
        primary_asset = state.get("primary_asset", "blog")
        channels = state.get("secondary_channels", [])
        outline = state.get("outline", "")
        primary_content = state.get("primary_content", "")
        channel_packages = state.get("channel_packages", {})
        tone = state.get("tone")
        audience = state.get("audience")

        package = {
            "primary_asset": primary_asset,
            "outline": outline,
            "primary_content": primary_content,
            "channel_assets": channel_packages,
            "tone": tone,
            "audience": audience,
        }

        summary = f"""🧩 Content package ready!
- Primary asset: {primary_asset.capitalize()}
- Derivative channels: {', '.join(channels) if channels else 'none'}
- Tone/Audience: {tone} / {audience}
Deliverables include outline, long-form copy, and channel-ready snippets."""

        return {
            "messages": [AIMessage(content=summary)],
            "response": summary,
            "metadata": {
                **state.get("metadata", {}),
                "package": package,
                "handler": "content",
            },
            "package": package,
        }

    def _sanitize_channels(self, channels: List[str], primary_asset: str) -> List[str]:
        """Remove duplicates and ensure newsletter isn't duplicated as both primary and secondary."""
        cleaned = []
        for channel in channels:
            if not channel:
                continue
            lowered = channel.lower().strip()
            if lowered == primary_asset:
                continue
            if lowered in self.channel_guidelines and lowered not in cleaned:
                cleaned.append(lowered)
            elif (
                lowered == "newsletter"
                and primary_asset != "newsletter"
                and lowered not in cleaned
            ):
                cleaned.append(lowered)
        if not cleaned:
            cleaned = self.default_channels.copy()
        return cleaned

    def _channel_prompt(self, channel: str, primary_asset: str, brief: str) -> str:
        """Guideline text for each derivative channel."""
        instructions = self.channel_guidelines.get(
            channel,
            "Summarize the primary asset for this channel in under 200 words.",
        )
        return f"""You are the Repurposing_Agent. Create the {channel} asset.
Brief: {brief}
Primary asset type: {primary_asset}
Guidelines: {instructions}
"""
