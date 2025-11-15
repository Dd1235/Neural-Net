import requests  # <-- Added
from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults

# Removed torch, PIL, and transformers imports

load_dotenv()

# -------------------------------
# 1. DEFINE SELF-HOSTED ENDPOINT
# -------------------------------
# This is your new vision model endpoint
MODAL_VISION_ENDPOINT = (
    "https://dd1235--nn-image-caption-imagecaptionserver-caption-image.modal.run"
)

# -------------------------------
# 2. INITIALIZE CLIENTS (Groq & Tavily)
# -------------------------------
client = Groq()
# As requested, not touching Tavily
search_tool = TavilySearchResults(max_results=3)


def generate_fast_response(prompt: str, max_tokens=1024, temperature=0.7) -> str:
    """Uses the fast Groq model for creative writing."""
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_completion_tokens=max_tokens,
            top_p=1,
            stream=False,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        raise


# Removed base64_to_pil_image helper function

# -------------------------------
# 4. STATE SCHEMA (Unchanged)
# -------------------------------
class VisualPostState(BaseModel):
    image_base64: str
    context: str
    platform: str
    image_caption: str | None = None
    platform_trends: str | None = None
    final_post: str | None = None


# -------------------------------
# 5. GRAPH NODES
# -------------------------------


def extract_image_caption(state: VisualPostState) -> Dict[str, Any]:
    """
    Node 1 (Branch A): (Vision Model - Modal)
    Takes the Base64 image and gets a caption from the self-hosted endpoint.
    """
    print("--- NODE 1 (A): CALLING SELF-HOSTED VISION MODEL (MODAL) ---")

    try:
        # --- THIS IS THE FIX ---
        # The 'state.image_base64' is the full Data URL from the frontend
        # (e.g., "data:image/jpeg;base64,/9j/4AAQSkZ...")
        # We must split it to get only the raw Base64 data,
        # just like your app.local_entrypoint() test does.
        
        try:
            # Split the string at the comma
            header, encoded_data = state.image_base64.split(",", 1)
        except ValueError:
            # If the split fails, it might already be raw Base64.
            # This makes the function more robust.
            print("Warning: Base64 string does not appear to be a Data URL. Sending as-is.")
            encoded_data = state.image_base64
            
        # --- END FIX ---

        # Prepare the payload for your Modal endpoint
        payload = {
            "image_base64": encoded_data,  # <-- Send *only* the raw Base64 data
            "prompt": "a detailed photo of",
        }

        # Call your Modal endpoint
        response = requests.post(MODAL_VISION_ENDPOINT, json=payload, timeout=30)

        # Raise an error if the request failed
        response.raise_for_status()

        result = response.json()
        caption = result.get("caption")

        if not caption:
            print("Error: Modal endpoint returned empty caption.")
            return {"image_caption": "(Image analysis failed: No caption returned.)"}

        print(f"Generated Caption: {caption}")
        return {"image_caption": caption}

    except requests.exceptions.HTTPError as http_err:
        print(f"Error calling Modal endpoint (HTTP): {http_err}")
        print(f"Response: {http_err.response.text}")
        return {"image_caption": f"(Image analysis failed: {http_err})"}
    except Exception as e:
        print(f"Error in vision model call: {e}")
        return {"image_caption": f"(Image analysis failed: {e})"}


def research_platform_trends(state: VisualPostState) -> Dict[str, Any]:
    """
    Node 2 (Branch B): (Research Agent - Tavily)
    Searches for the latest trends for the given platform and context.
    """
    print(f"--- NODE 1 (B): RESEARCHING {state.platform.upper()} TRENDS (TAVILY) ---")
    try:
        query = f"latest {state.platform} trends for {state.context}"

        # This code still uses the old Tavily package, as requested
        results: List[Dict] = search_tool.invoke(query)

        # This line will likely fail, but was not touched per your instruction
        formatted_trends = "\n".join(
            [f"- {r['content']} (Source: {r['url']})" for r in results]
        )

        print(f"Found Trends: {formatted_trends}")
        return {"platform_trends": formatted_trends}

    except Exception as e:
        print(f"Error in Tavily search: {e}")
        return {"platform_trends": "No trend research available."}


def generate_platform_post(state: VisualPostState) -> Dict[str, Any]:
    """
    Node 3 (Join Node): (Text Model - Groq/Llama)
    Takes context, caption, AND trends to write the final post.
    """
    print("--- NODE 2 (JOIN): GENERATING PLATFORM POST (GROQ/LLAMA) ---")
    try:
        # The prompt is now updated to know the trends won't have sources
        prompt = f"""
        You are an expert social media manager and copywriter for {state.platform}.
        Your task is to write a compelling, trend-aware post that combines three pieces of information.

        ---
        1. User's Context (The main topic):
        {state.context}
        ---
        2. Image Description (What the user is showing):
        {state.image_caption}
        ---
        3. Latest Platform Trends (Snippets of text):
        {state.platform_trends}
        ---

        Write a natural-sounding post for {state.platform}.
        - **Integrate** all three pieces of information seamlessly.
        - **Use a style** that matches the latest trends (e.g., if trends mention "storytelling" or "UGC", use that).
        - **Format** the post perfectly for {state.platform} (e.g., professional for LinkedIn, engaging with hashtags for Instagram).
        """
        final_post = generate_fast_response(prompt)
        print(f"Generated Post: {final_post[:100]}...")
        return {"final_post": final_post}

    except Exception as e:
        print(f"Error in Groq model generation: {e}")
        return {"final_post": f"Error: Could not generate post. {e}"}


# -------------------------------
# 6. BUILD THE GRAPH
# -------------------------------
def build_visual_content_graph() -> StateGraph:
    """Builds the parallel workflow."""

    graph = StateGraph(VisualPostState)

    # 1. Add all the nodes
    graph.add_node("extract_image_caption", extract_image_caption)
    graph.add_node("research_platform_trends", research_platform_trends)
    graph.add_node("generate_platform_post", generate_platform_post)

    # 2. Define the graph flow
    graph.add_edge(START, "extract_image_caption")
    graph.add_edge(START, "research_platform_trends")

    # 3. Define the "join" point
    graph.add_edge(
        ["extract_image_caption", "research_platform_trends"],
        "generate_platform_post",
    )

    # 4. The final node ends the graph
    graph.add_edge("generate_platform_post", END)

    return graph.compile()