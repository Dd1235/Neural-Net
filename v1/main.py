"""
Main Application for LangGraph Agent System
================================================
A multi-agent orchestration framework for generating:
- Blogs & newsletters
- Creative social media assets
- General-purpose AI chat

Features
-----------
Built with FastAPI + LangGraph
Async orchestration and CLI mode
Modular agent loading and graph compilation
Health & Ping endpoints
Verbose console logging for demos

Example:
--------
Start server:
    uvicorn main:app --reload --port 8000

CLI mode (interactive):
    python main.py cli

Endpoints:
-----------
/chat          → Chat with any agent
/content       → Multi-channel content generation
/blog-workflow → Full blog creation walkthrough
/agents        → List loaded agents
/health, /ping → Health checks

"""

import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

# === Import your agents ===
from agents.blog_workflow.agent import BlogWorkflowAgent
from agents.content_workflow.agent import ContentCreationAgent
from agents.multipurpose_bot.agent import MultipurposeBot
from agents.newsroom.agent import NewsroomAgent
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

# === Configure Logging ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("main_app")


# ============================
# Request & Response Models
# ============================


class ChatRequest(BaseModel):
    message: str
    agent_type: str = Field(
        "multipurpose",
        description="Agent type: multipurpose | content | blog_workflow | newsroom",
    )
    thread_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    thread_id: str
    agent_type: str
    metadata: Optional[Dict[str, Any]] = None


class ContentRequest(BaseModel):
    brief: str
    primary_asset: Literal["blog", "newsletter"] = "blog"
    secondary_channels: List[str] = ["linkedin", "instagram"]
    word_count: Optional[int] = None
    tone: Optional[str] = None
    audience: Optional[str] = None
    thread_id: Optional[str] = None


class ContentResponse(BaseModel):
    summary: str
    thread_id: str
    package: Dict[str, Any]


class BlogWorkflowRequest(BaseModel):
    brief: str
    topic: str = "The Future of Remote Work"
    word_count: int = 1000
    tone: str = "forward-looking and pragmatic"
    audience: str = "business decision makers"
    thread_id: Optional[str] = None


class BlogWorkflowResponse(BaseModel):
    summary: str
    thread_id: str
    package: Dict[str, Any]


# feature 1 - Generate blogs, request response


class BlogRequest(BaseModel):
    brand: Optional[str] = None
    prompt: str
    modalities: List[Literal["medium", "linkedin"]] = Field(
        default_factory=lambda: ["medium", "linkedin"]
    )
    word_counts: Dict[Literal["medium", "linkedin"], int] = Field(
        default_factory=lambda: {"medium": 600, "linkedin": 200},
        description="Per-modality word limits",
    )
    original_draft: Optional[str] = Field(
        default=None,
        description="Optional existing draft or notes to refine and build upon.",
    )
    thread_id: Optional[str] = None


class BlogResponse(BaseModel):
    # Core outputs
    drafts: Dict[str, str] = Field(
        ...,
        description="Generated text drafts per modality, e.g. {'medium': '...', 'linkedin': '...'}",
    )

    research_context: Optional[str] = None
    hero_image_url: Optional[str] = None
    thread_id: str  # same as in request (for linking runs)


class NewsroomRequest(BaseModel):
    brief: str
    topic: Optional[str] = None
    modalities: List[Literal["news_article", "medium", "linkedin"]] = Field(
        default_factory=lambda: ["news_article", "medium", "linkedin"]
    )
    tone: Optional[str] = None
    audience: Optional[str] = None
    timeframe: Optional[str] = None
    thread_id: Optional[str] = None


class NewsroomResponse(BaseModel):
    summary: str
    thread_id: str
    package: Dict[str, Any]


# =====================
# AgentManager Class
# =====================


class AgentManager:
    """Manages all agents and orchestrates interactions."""

    def __init__(self):
        self.logger = logging.getLogger("AgentManager")
        self.agents = {}
        self._initialized = False

    async def initialize(self):
        """Load and compile all agents"""
        if self._initialized:
            self.logger.info("Agents already initialized.")
            return
        self.logger.info("\nInitializing agents...\n")
        try:
            # Instantiate agents
            self.agents["multipurpose"] = MultipurposeBot()
            self.agents["content"] = ContentCreationAgent()
            self.agents["blog_workflow"] = BlogWorkflowAgent()
            self.agents["newsroom"] = NewsroomAgent()

            # Compile LangGraph graphs for each
            for name, agent in self.agents.items():
                self.logger.info(f"Compiling graph for '{name}' agent...")
                agent.compile()
                self.logger.info(f"'{name}' agent ready!\n")

            self._initialized = True
            self.logger.info("All agents initialized successfully!\n")

        except Exception as e:
            self.logger.error(f"Initialization failed: {str(e)}")
            raise

    def get_agent(self, agent_type: str):
        agent = self.agents.get(agent_type)
        if not agent:
            raise ValueError(f"Unknown agent type: {agent_type}")
        return agent

    async def process_message(
        self,
        message: str,
        agent_type: str = "multipurpose",
        thread_id: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Route message to the specified agent"""
        agent = self.get_agent(agent_type)
        thread_id = thread_id or str(uuid.uuid4())
        self.logger.info(f"\n[Incoming] ({agent_type}) → {message}")
        input_data = {"messages": [HumanMessage(content=message)], **kwargs}

        self.logger.info("Invoking agent...")
        result = await agent.ainvoke(input_data, thread_id=thread_id)
        self.logger.info("Agent finished processing.\n")

        return {"result": result, "thread_id": thread_id, "agent_type": agent_type}


agent_manager = AgentManager()


# ==========================
# FastAPI App Definition
# ==========================


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("\nStarting application...\n")
    await agent_manager.initialize()
    yield
    logger.info("\nApplication shutting down...\n")


app = FastAPI(
    title="LangGraph Agent System",
    description="Multi-agent orchestration for content creation, stories, and chat",
    version="1.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =======================
# Root & Health Routes
# =======================


# curl -X GET http://localhost:8000/


@app.get("/")
async def root():
    """Welcome Endpoint"""
    return {
        "message": "LangGraph Multi-Agent System",
        "available_agents": list(agent_manager.agents.keys()),
        "example_endpoints": {
            "/chat": "POST {'message': 'Hello!', 'agent_type': 'multipurpose'}",
            "/content": "POST {'brief': 'New product launch', 'primary_asset': 'blog'}",
            "/blog-workflow": "POST {'brief': 'Remote work blog'}",
            "/newsroom": "POST {'brief': 'EV battery policies', 'modalities': ['news_article','linkedin']}",
        },
    }


# curl -X GET http://localhost:8000/health


@app.get("/health")
async def health_check():
    """Check full system health"""
    return {
        "status": "healthy",
        "agents_initialized": agent_manager._initialized,
        "agents_count": len(agent_manager.agents),
    }


# curl -X GET http://localhost:8000/ping


@app.get("/ping")
async def ping():
    """Simple ping endpoint"""
    return {"ping": "pong"}


# curl -X GET http://localhost:8000/agents


@app.get("/agents")
async def list_agents():
    """List all initialized agents"""
    return {
        "agents": {
            name: {
                "name": agent.name,
                "memory_enabled": getattr(agent, "memory_enabled", False),
                "compiled": getattr(agent, "compiled_graph", None) is not None,
            }
            for name, agent in agent_manager.agents.items()
        }
    }


# =======================
# Chat Endpoint
# =======================


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with a specific agent

    Example:
    --------
    curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" \
    -d '{"message": "Tell me a joke", "agent_type": "multipurpose"}'
    """
    try:
        result = await agent_manager.process_message(
            message=request.message,
            agent_type=request.agent_type,
            thread_id=request.thread_id,
        )
        agent_result = result["result"]
        response_text = (
            agent_result.get("response") or agent_result.get("messages", [])[-1].content
        )

        return ChatResponse(
            response=response_text,
            thread_id=result["thread_id"],
            agent_type=result["agent_type"],
            metadata=agent_result.get("metadata"),
        )

    except Exception as e:
        logger.error(f"Error in /chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =======================
# Content Workflow
# =======================


@app.post("/content", response_model=ContentResponse)
async def generate_content(request: ContentRequest):
    """
    Multi-Agent Content Creation Workflow

    Example:
    --------
    curl -X POST http://localhost:8000/content -H "Content-Type: application/json" \
    -d '{"brief": "Launch recap blog", "primary_asset": "blog", "secondary_channels": ["linkedin"]}'
    """
    try:
        result = await agent_manager.process_message(
            message=request.brief,
            agent_type="content",
            thread_id=request.thread_id,
            primary_asset=request.primary_asset,
            secondary_channels=request.secondary_channels,
            word_count=request.word_count,
            tone=request.tone,
            audience=request.audience,
        )

        agent_result = result["result"]
        package = agent_result.get("package") or agent_result.get("metadata", {}).get(
            "package"
        )

        summary = (
            agent_result.get("response") or agent_result.get("messages", [])[-1].content
        )
        return ContentResponse(
            summary=summary, thread_id=result["thread_id"], package=package
        )

    except Exception as e:
        logger.error(f"Error in /content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =======================
# Blog Workflow
# =======================


@app.post("/blog-workflow", response_model=BlogWorkflowResponse)
async def run_blog_workflow(request: BlogWorkflowRequest):
    """
    Walkthrough-style Blog Generation Workflow

    Example:
    --------
    curl -X POST http://localhost:8000/blog-workflow -H "Content-Type: application/json" \
    -d '{"brief": "Need remote work blog", "topic": "The Future of Remote Work"}'
    """
    try:
        result = await agent_manager.process_message(
            message=request.brief,
            agent_type="blog_workflow",
            thread_id=request.thread_id,
            topic=request.topic,
            word_count=request.word_count,
            tone=request.tone,
            audience=request.audience,
        )

        agent_result = result["result"]
        package = agent_result.get("package") or agent_result.get("metadata", {}).get(
            "package"
        )
        summary = (
            agent_result.get("response") or agent_result.get("messages", [])[-1].content
        )

        return BlogWorkflowResponse(
            summary=summary, thread_id=result["thread_id"], package=package
        )

    except Exception as e:
        logger.error(f"Error in /blog-workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/newsroom", response_model=NewsroomResponse)
async def generate_newsroom_assets(request: NewsroomRequest):
    """
    Newsroom workflow: research 

    Example:
    --------
    curl -X POST http://localhost:8000/newsroom -H "Content-Type: application/json" \\
    -d '{"brief": "Summarize EV battery policy shifts", "modalities": ["news_article","linkedin"]}'
    """
    try:
        result = await agent_manager.process_message(
            message=request.brief,
            agent_type="newsroom",
            thread_id=request.thread_id,
            topic=request.topic,
            modalities=request.modalities,
            tone=request.tone,
            audience=request.audience,
            timeframe=request.timeframe,
        )

        agent_result = result["result"]
        package = agent_result.get("package") or agent_result.get("metadata", {}).get(
            "package"
        )
        summary = (
            agent_result.get("response") or agent_result.get("messages", [])[-1].content
        )

        return NewsroomResponse(
            summary=summary,
            thread_id=result["thread_id"],
            package=package,
        )
    except Exception as e:
        logger.error(f"Error in /newsroom: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_blog", response_model=BlogResponse)
async def generate_blog(request: BlogRequest):
    """
    Dummy blog generation endpoint — later replace with real LangGraph agent.
    """

    # Dummy outputs for now
    drafts = {}
    for modality in request.modalities:
        drafts[modality] = (
            f"[{modality.upper()} DRAFT] Generated content for: '{request.prompt}' ({request.word_counts.get(modality, 200)} words)"
        )

    response = BlogResponse(
        drafts=drafts,
        hero_image_url="https://pollinations.ai/p/example-image",
        thread_id=request.thread_id or "session-xyz123",
    )
    return response


# =======================
# CLI Interface
# =======================


async def cli_interface():
    print("\nLangGraph Agent System CLI\n" + "=" * 50)
    print("Available agents:")
    for a in ["multipurpose", "content", "blog_workflow", "newsroom"]:
        print(f"   • {a}")
    print("\nCommands: 'switch <agent>' | 'new' | 'exit'\n")

    await agent_manager.initialize()

    current_agent = "multipurpose"
    thread_id = str(uuid.uuid4())

    while True:
        try:
            user_input = input(f"\n[{current_agent}] > ").strip()
            if user_input.lower() == "exit":
                print("\nGoodbye!\n")
                break
            if user_input.lower().startswith("switch "):
                new_agent = user_input[7:].strip()
                if new_agent in agent_manager.agents:
                    current_agent = new_agent
                    thread_id = str(uuid.uuid4())
                    print(f"Switched to '{current_agent}' agent.\n")
                else:
                    print(f"Unknown agent: {new_agent}")
                continue
            if user_input.lower() == "new":
                thread_id = str(uuid.uuid4())
                print("Started a new thread.\n")
                continue

            print("\nProcessing...\n")
            result = await agent_manager.process_message(
                message=user_input,
                agent_type=current_agent,
                thread_id=thread_id,
            )

            agent_result = result["result"]
            response = (
                agent_result.get("response")
                or agent_result.get("messages", [])[-1].content
            )

            print("\nResponse:\n" + "-" * 50)
            print(response)
            print("-" * 50)

            if "metadata" in agent_result and agent_result["metadata"]:
                print("\nMetadata:", json.dumps(agent_result["metadata"], indent=2))

        except KeyboardInterrupt:
            print("\nInterrupted. Type 'exit' to quit.")
        except Exception as e:
            print(f"\nError: {str(e)}")


# =======================
# Main Entry Point
# =======================

if __name__ == "__main__":
    import sys

    import uvicorn

    if len(sys.argv) > 1 and sys.argv[1] == "cli":
        asyncio.run(cli_interface())
    else:
        uvicorn.run(
            "main:app", host="0.0.0.0", port=8000, reload=True, log_level="info"
        )
