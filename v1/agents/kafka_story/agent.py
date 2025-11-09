"""
Kafka-inspired short story agent for testing output quality.
"""

from typing import Dict, Type

from core.base_agent import BaseAgent
from core.state import BaseState, InputState, OutputState
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph


class KafkaStoryAgent(BaseAgent):
    """Generates ~500-word surreal short stories in a Kafka-esque voice."""

    def __init__(self, **kwargs):
        super().__init__(
            name="KafkaStoryAgent",
            system_prompt=self._system_prompt(),
            **kwargs,
        )

    def _system_prompt(self) -> str:
        return (
            "You are a literary assistant channeling Franz Kafka's tone: surreal, "
            "existential, slightly bureaucratic, concise yet haunting."
        )

    def get_state_schema(self) -> Type:
        return BaseState

    def build_graph(self) -> StateGraph:
        workflow = StateGraph(BaseState, input=InputState, output=OutputState)
        workflow.add_node("craft_story", self.craft_story)
        workflow.add_edge(START, "craft_story")
        workflow.add_edge("craft_story", END)
        return workflow

    def craft_story(self, state: BaseState, config: RunnableConfig) -> Dict[str, str]:
        """Generate the Kafka-inspired story."""
        messages = state["messages"]
        prompt = messages[-1].content if messages else "Write about an ordinary clerk."

        story_prompt = f"""Write a Kafka-esque short story of approximately 500 words.
Constraints:
- Maintain first or close-third person perspective.
- Keep the tone surreal, anxious, and tinged with dark humor.
- Include subtle references to paperwork, corridors, or unending waiting rooms.
- End with a contemplative sentence that lingers.

Story seed: {prompt}
"""

        response = self.model.invoke(
            [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=story_prompt),
            ]
        )

        return {
            "messages": [AIMessage(content=response.content)],
            "response": response.content,
            "metadata": {"style": "kafkaesque", "approx_words": 500},
        }
