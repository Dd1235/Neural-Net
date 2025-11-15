from typing import Dict, Any
from pydantic import BaseModel
from .visual_content_workflow_model import build_visual_content_graph, VisualPostState

# Pydantic model to validate the input from the frontend
class VisualPostInput(BaseModel):
    image_base64: str
    context: str
    platform: str

class VisualContentAgent:
    """
    A simple wrapper class for the Visual Content LangGraph workflow.
    This class is called by the API router.
    """
    
    def __init__(self):
        """
        Initializes the agent by building and compiling the LangGraph workflow.
        """
        self.graph = build_visual_content_graph()

    def invoke(self, data: VisualPostInput) -> Dict[str, Any]:
        """
        Runs the visual content workflow.
        
        Args:
            data: A VisualPostInput object from the frontend.
            
        Returns:
            A dictionary containing the 'generated_post'.
        """
        try:
            # 1. Prepare the initial state
            # The keys must match the VisualPostState model
            initial_state: VisualPostState = {
                "image_base64": data.image_base64,
                "context": data.context,
                "platform": data.platform,
                "image_caption": None, # Will be filled by Node 1
                "final_post": None,    # Will be filled by Node 2
            }

            # 2. Run the graph
            # This will execute the full chain: BLIP -> Groq
            final_state = self.graph.invoke(initial_state)

            # 3. Extract the final post
            generated_post = final_state.get("final_post")
            if generated_post is None:
                raise Exception("Workflow finished but final_post was not generated.")

            # 4. Return the response in the format the frontend expects
            return {"generated_post": generated_post}

        except Exception as e:
            print(f"Error during visual content workflow: {e}")
            # Return an error key so the router can catch it
            return {"error": str(e)}