"""
State definitions for agent workflows
"""

from typing import Annotated, Any, Dict, List, Literal, Optional

from langgraph.graph.message import AnyMessage, add_messages
from pydantic import BaseModel, Field
from typing_extensions import TypedDict


class BaseState(TypedDict):
    """Base state for all agents"""

    messages: Annotated[List[AnyMessage], add_messages]
    error: Optional[str]
    metadata: Dict[str, Any]


class RAGState(BaseState):
    """State for RAG operations"""

    query: str
    documents: Optional[List[Dict[str, Any]]]
    answer: Optional[str]
    sources: Optional[List[str]]


class MultipurposeState(BaseState):
    """State for multipurpose bot"""

    query: str
    intent: Optional[str]  # chitchat, ping, unknown
    sub_state: Optional[Dict[str, Any]]
    response: Optional[str]


class ContentWorkflowState(BaseState):
    """State for multi-asset content workflow"""

    brief: str
    primary_asset: Optional[str]
    word_count: Optional[int]
    tone: Optional[str]
    audience: Optional[str]
    secondary_channels: List[str]
    outline: Optional[str]
    primary_content: Optional[str]
    channel_packages: Optional[Dict[str, str]]
    package_metadata: Optional[Dict[str, Any]]


class BlogWorkflowState(BaseState):
    """State for walkthrough-inspired blog workflow"""

    brief: str
    topic: Optional[str]
    word_count: Optional[int]
    tone: Optional[str]
    audience: Optional[str]
    plan: Optional[List[str]]
    research_notes: Optional[str]
    draft: Optional[str]
    compliance_report: Optional[Dict[str, Any]]
    needs_revision: bool
    revision_notes: Optional[str]
    revision_count: int
    social_assets: Optional[Dict[str, Any]]
    hero_prompt: Optional[str]
    package: Optional[Dict[str, Any]]


class NewsroomState(BaseState):
    """State for news article + modality package generation"""

    brief: str
    topic: Optional[str]
    modalities: List[str]
    tone: Optional[str]
    audience: Optional[str]
    timeframe: Optional[str]
    research_queries: Optional[List[str]]
    research_digest: Optional[str]
    outline: Optional[str]
    assets: Optional[Dict[str, str]]
    package: Optional[Dict[str, Any]]


class InputState(TypedDict):
    """Input state schema"""

    messages: Annotated[List[AnyMessage], add_messages]


class OutputState(TypedDict):
    """Output state schema"""

    messages: Annotated[List[AnyMessage], add_messages]
    response: str
    metadata: Optional[Dict[str, Any]]


# Intent Classification Schema
class IntentClassification(BaseModel):
    """Schema for intent classification"""

    intent: str = Field(
        description="The classified intent (e.g., chitchat, ping, unknown)"
    )
    confidence: float = Field(
        description="Confidence score between 0 and 1", ge=0.0, le=1.0
    )
    reasoning: str = Field(description="Brief explanation for the classification")


class ContentIntent(BaseModel):
    """Schema for classifying content workflow intent"""

    primary_asset: Literal["blog", "newsletter"] = Field(
        description="Primary long-form asset to create"
    )
    channels: List[
        Literal["linkedin", "instagram", "newsletter", "twitter", "threads"]
    ] = Field(description="Channels that require derivative assets")
    summary: str = Field(description="One sentence summary of the intent")
