"""
Ping Agent — only responds with 'Pong' when input is 'Ping'
"""

from typing import Any, Dict, Type

from core.base_agent import BaseAgent
from core.state import BaseState, InputState, OutputState
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph


class PingAgent(BaseAgent):
    """Agent that only responds to 'Ping' with 'Pong'"""

    def __init__(self, **kwargs):
        """Initialize Ping Agent"""
        super().__init__(
            name="PingAgent",
            system_prompt="You only respond 'Pong' when you receive 'Ping'.",
            **kwargs
        )

    def get_state_schema(self) -> Type:
        """Define simple state schema"""
        return BaseState

    def build_graph(self) -> StateGraph:
        """Build a minimal graph"""
        workflow = StateGraph(BaseState, input=InputState, output=OutputState)

        workflow.add_node("check_ping", self.check_ping)
        workflow.add_edge(START, "check_ping")
        workflow.add_edge("check_ping", END)

        return workflow

    def check_ping(self, state: BaseState, config: RunnableConfig) -> Dict[str, Any]:
        """Check message content and respond accordingly"""
        self.logger.info("Checking for 'Ping' message")

        messages = state["messages"]
        last_message = messages[-1].content.strip().lower() if messages else ""

        if last_message == "ping":
            response_text = "Pong"
        else:
            response_text = "I only respond to 'Ping' with 'Pong'."

        return {
            "messages": [AIMessage(content=response_text)],
            "response": response_text,
            "metadata": {"received": last_message},
        }
