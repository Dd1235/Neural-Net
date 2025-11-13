from typing import Any, Dict
from langgraph.graph import StateGraph
from .blog_workflow_model import BlogState, build_blog_graph


class BlogWorkflowAgent:
    """Agent wrapper around the blog workflow graph."""

    def __init__(self):
        self.graph = None

    def compile(self):
        """Build the LangGraph workflow."""
        self.graph = build_blog_graph()

    async def ainvoke(self, input_data: Dict[str, Any], thread_id: str = None):
        """Run the workflow asynchronously (currently synchronous execution)."""
        try:
            # 🧠 Extract input fields from frontend
            state = BlogState(
                brand_name=input_data.get("brand_name", ""),
                brand_voice=input_data.get("brand_voice", ""),
                prompt=input_data.get("prompt", ""),
                tone=input_data.get("tone", ""),
                audience=input_data.get("audience", ""),
                modalities=input_data.get("modalities", {}),
            )

            # ⚙️ Run the LangGraph workflow
            graph = self.graph or build_blog_graph()
            app = graph.compile()
            result = app.invoke(state)

            # ✅ Convert to dict if needed (for JSON serialization)
            if hasattr(result, "dict"):
                result = result.dict()

            return {
                "status": "success",
                "data": result
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
