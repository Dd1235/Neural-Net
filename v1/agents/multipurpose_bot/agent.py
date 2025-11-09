"""
Multipurpose Bot Agent with routing to chitchat and ping subagents
"""

from typing import Any, Dict, Literal, Type

from core.base_agent import BaseAgent
from core.state import InputState, IntentClassification, MultipurposeState, OutputState
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph

from .subagents.chitchat_agent import ChitchatAgent
from .subagents.ping_agent import PingAgent


class MultipurposeBot(BaseAgent):
    """Main multipurpose bot that routes to specialized subagents"""

    def __init__(self, **kwargs):
        """Initialize Multipurpose Bot"""
        super().__init__(
            name="MultipurposeBot",
            system_prompt=self._get_multipurpose_prompt(),
            **kwargs,
        )

        # Initialize subagents
        self.chitchat_agent = ChitchatAgent()
        self.ping_agent = PingAgent()

        # Intent classifier
        self.intent_classifier = self.model.with_structured_output(IntentClassification)

    def _get_multipurpose_prompt(self) -> str:
        """Get system prompt for multipurpose bot"""
        return """You are a versatile AI assistant with two clear capabilities:

        1. General chitchat - friendly, thoughtful, and engaging conversation
        2. Ping utility - when someone says 'Ping', respond with 'Pong' to confirm responsiveness

        If a request falls outside these skills, politely explain what you can help with."""

    def get_state_schema(self) -> Type:
        """Get the state schema for this agent"""
        return MultipurposeState

    def build_graph(self) -> StateGraph:
        """Build the multipurpose bot graph"""
        workflow = StateGraph(MultipurposeState, input=InputState, output=OutputState)

        # Add nodes
        workflow.add_node("classify_intent", self.classify_intent)
        workflow.add_node("route_chitchat", self.route_to_chitchat)
        workflow.add_node("route_ping", self.route_to_ping)
        workflow.add_node("handle_unknown", self.handle_unknown)
        workflow.add_node("prepare_response", self.prepare_response)

        # Add routing logic
        workflow.add_edge(START, "classify_intent")

        # Conditional routing based on intent
        workflow.add_conditional_edges(
            "classify_intent",
            self.route_by_intent,
            {
                "chitchat": "route_chitchat",
                "ping": "route_ping",
                "unknown": "handle_unknown",
            },
        )

        # All routes lead to prepare_response
        workflow.add_edge("route_chitchat", "prepare_response")
        workflow.add_edge("route_ping", "prepare_response")
        workflow.add_edge("handle_unknown", "prepare_response")

        # Final response preparation
        workflow.add_edge("prepare_response", END)

        return workflow

    def classify_intent(
        self, state: MultipurposeState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Classify the intent of the user's query"""
        self.logger.info("Classifying user intent")

        messages = state["messages"]
        last_message = messages[-1].content if messages else ""

        # Classify intent
        classification_prompt = """Classify the following query into one of these categories:
        - 'chitchat': General conversation, greetings, personal reflections, or casual topics
        - 'ping': Messages where the user says 'Ping' (or is clearly testing responsiveness)
        - 'unknown': Queries that don't clearly fit the above categories

        Query: {query}

        Provide your classification with reasoning."""

        classification = self.intent_classifier.invoke(
            [SystemMessage(content=classification_prompt.format(query=last_message))]
        )

        self.logger.info(
            f"Intent classified as: {classification.intent} (confidence: {classification.confidence})"
        )

        return {
            "query": last_message,
            "intent": classification.intent,
            "metadata": {
                "intent_confidence": classification.confidence,
                "reasoning": classification.reasoning,
            },
        }

    def route_by_intent(
        self, state: MultipurposeState
    ) -> Literal["chitchat", "ping", "unknown"]:
        """Determine routing based on classified intent"""
        intent = state.get("intent", "unknown")
        self.logger.info(f"Routing to {intent} handler")
        return intent

    def route_to_chitchat(
        self, state: MultipurposeState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Route to chitchat agent for conversation"""
        self.logger.info("Routing to chitchat agent")

        query = state["query"]

        # Compile chitchat agent if needed
        if self.chitchat_agent.compiled_graph is None:
            self.chitchat_agent.compile()

        # Invoke chitchat agent
        result = self.chitchat_agent.invoke(
            {"messages": [HumanMessage(content=query)]}, config=config
        )

        return {
            "sub_state": result,
            "response": result.get("response", ""),
            "metadata": {**state.get("metadata", {}), "handler": "chitchat"},
        }

    def route_to_ping(
        self, state: MultipurposeState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Route to ping agent for 'Ping' responses"""
        self.logger.info("Routing to ping agent")

        query = state["query"]

        # Compile ping agent if needed
        if self.ping_agent.compiled_graph is None:
            self.ping_agent.compile()

        # Invoke ping agent
        result = self.ping_agent.invoke(
            {"messages": [HumanMessage(content=query)]}, config=config
        )

        return {
            "sub_state": result,
            "response": result.get("response", ""),
            "metadata": {**state.get("metadata", {}), "handler": "ping"},
        }

    def handle_unknown(
        self, state: MultipurposeState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Handle unknown intents"""
        self.logger.info("Handling unknown intent")

        query = state["query"]

        response_prompt = """The user's query doesn't clearly match our specialized capabilities.
        Provide a helpful response that:
        1. Acknowledges their question
        2. Explains that we currently help with casual conversation or ping/pong tests
        3. Offers a suggestion for how they might rephrase or use another resource

        Query: {query}"""

        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=response_prompt.format(query=query)),
            ]
        )

        return {
            "response": response.content,
            "metadata": {**state.get("metadata", {}), "handler": "unknown"},
        }

    def prepare_response(
        self, state: MultipurposeState, config: RunnableConfig
    ) -> Dict[str, Any]:
        """Prepare final response"""
        self.logger.info("Preparing final response")

        response = state.get("response", "I'm sorry, I couldn't process your request.")

        # Add any post-processing or formatting here
        final_response = self._format_response(response, state.get("metadata", {}))

        return {
            "messages": [AIMessage(content=final_response)],
            "response": final_response,
            "metadata": state.get("metadata", {}),
        }

    def _format_response(self, response: str, metadata: Dict[str, Any]) -> str:
        """Format the final response"""
        # Add any special formatting based on handler type
        handler = metadata.get("handler", "unknown")

        if handler == "ping":
            return response

        return response
