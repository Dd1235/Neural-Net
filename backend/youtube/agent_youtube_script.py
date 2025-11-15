from typing import Any, Dict
from langgraph.graph import StateGraph
from .youtube_script_model import YoutubeScript, build_youtube_graph


class YoutubeScriptAgent:
    """Agent wrapper around the YouTube script workflow."""

    def __init__(self):
        self.graph = None

    def compile(self):
        """Build the LangGraph workflow."""
        self.graph = build_youtube_graph()

    async def ainvoke(self, input_data: Dict[str, Any], thread_id: str = None):
        print("=== ainvoke received input_data ===")
        print(input_data)

        try:
            # 🧠 Build state object using frontend fields
            state = YoutubeScript(
                channelDescription=input_data.get("channelDescription", ""),
                prompt=input_data.get("prompt", ""),
                subscribers=input_data.get("subscribers", ""),
                videoType=input_data.get("videoType", "shortform"),
                tone=input_data.get("tone", ""),
                audience=input_data.get("audience", ""),
                threadId=input_data.get("threadId", "e.g. session-abc123"),
            )

            # ⚙️ Build & run workflow
            graph = self.graph or build_youtube_graph()
            app = graph.compile()
            result = app.invoke(state)

            # 📝 Extract final script
            final_script = result.get("script_draft")
            revision_count = result.get("revision_count")


            return {
                "status": "success",
                "data": {
                    "script": final_script,
                    "revision_count": revision_count,
                    "threadId": state.threadId,
                    "raw_result": result
                }
            }

        except Exception as e:
            print(f"Error in YoutubeScriptAgent: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
