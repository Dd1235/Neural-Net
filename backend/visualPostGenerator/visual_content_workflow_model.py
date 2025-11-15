import base64
import io
import torch
from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
from langchain_community.tools.tavily_search import TavilySearchResults

load_dotenv()

# -------------------------------
# 1. LOAD OPEN-SOURCE VISION MODEL (BLIP)
# -------------------------------

# Global cache for the model
_model_cache = {}

def get_blip_model():
    """Loads the BLIP model as a singleton, only once."""
    if "model" in _model_cache:
        return _model_cache["model"], _model_cache["processor"], _model_cache["device"]

    print("Loading Hugging Face BLIP model... This may take a moment.")
    try:
        DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
        PROCESSOR = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large", use_fast=True)
        MODEL = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large").to(DEVICE)
        print(f"BLIP model loaded successfully on {DEVICE}.")
        
        _model_cache["model"] = MODEL
        _model_cache["processor"] = PROCESSOR
        _model_cache["device"] = DEVICE
        return MODEL, PROCESSOR, DEVICE
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load BLIP model: {e}")
        raise e

# -------------------------------
# 2. INITIALIZE CLIENTS (Groq & Tavily)
# -------------------------------
client = Groq()
# --- 2. Reverted to old Tavily initialization ---
search_tool = TavilySearchResults(max_results=3)

# ... (generate_fast_response and base64_to_pil_image functions are unchanged) ...
def generate_fast_response(prompt: str, max_tokens=1024, temperature=0.7) -> str:
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

def base64_to_pil_image(base64_str: str) -> Image.Image:
    try:
        header, encoded_data = base64_str.split(",", 1)
        image_data = base64.b64decode(encoded_data)
        image = Image.open(io.BytesIO(image_data))
        if image.mode != "RGB":
            image = image.convert("RGB")
        return image
    except Exception as e:
        print(f"Error parsing Base64 string to PIL Image: {e}")
        return None

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
    Node 1 (Branch A): (Vision Model - BLIP)
    Takes the Base64 image and generates a text description.
    """
    print("--- NODE 1 (A): EXTRACTING IMAGE CAPTION (BLIP) ---")
    
    try:
        MODEL, PROCESSOR, DEVICE = get_blip_model()
    except Exception as e:
        print(f"Error getting BLIP model: {e}")
        return {"image_caption": f"(Image analysis failed: model not loaded.)"}
        
    try:
        pil_image = base64_to_pil_image(state.image_base64)
        if pil_image is None:
            raise Exception("Invalid image data.")

        text = "a photo of"
        inputs = PROCESSOR(pil_image, text, return_tensors="pt").to(DEVICE)
        out = MODEL.generate(**inputs, max_new_tokens=50)
        caption = PROCESSOR.decode(out[0], skip_special_tokens=True)
        
        if caption.startswith(text):
            caption = caption[len(text):].strip()
        
        print(f"Generated Caption: {caption}")
        return {"image_caption": caption}

    except Exception as e:
        print(f"Error in BLIP model generation: {e}")
        return {"image_caption": f"(Image analysis failed: {e})"}


def research_platform_trends(state: VisualPostState) -> Dict[str, Any]:
    """
    Node 2 (Branch B): (Research Agent - Tavily)
    Searches for the latest trends for the given platform and context.
    """
    print(f"--- NODE 1 (B): RESEARCHING {state.platform.upper()} TRENDS (TAVILY) ---")
    try:
        query = f"latest {state.platform} trends for {state.context}"
        
        # 'invoke' returns a list of dictionaries
        results: List[Dict] = search_tool.invoke(query) 
        
        # --- THIS IS THE FIX ---
        # Correctly access the 'content' and 'url' keys from each dictionary 'r'
        formatted_trends = "\n".join(
            [f"- {r['content']} (Source: {r['url']})" for r in results]
        )
        # --- END FIX ---

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