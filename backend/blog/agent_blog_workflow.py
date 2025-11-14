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
        print("=== ainvoke received input_data ===")
        print(input_data)

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

            formatted_output = ""
            if "social_assets" in result and result["social_assets"]:
                for modality in state.modalities.keys():  # Only include selected modalities
                    content = result["social_assets"].get(modality, "")
                    print(f"Modality: {modality}, Content: {repr(content)}")
                    formatted_output += f"### {modality}\n{content}\n\n"

                return {
                    "status": "success",
                    "data": {
                    "formatted_blog": formatted_output.strip(),  # ready for frontend
                    "raw_result": result  # optional: full workflow output
                    }
                }

        except Exception as e:
            print(f"Error in BlogWorkflowAgent: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
