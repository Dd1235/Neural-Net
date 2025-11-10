1. **Create virtual environment**

```bash
python -m venv venv
source venv/bin/activate
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

Add your OPENAI api key and langsmith api key, if using other models, add their keys too.
3 **Setup environment variables**

```bash
cp .env.example .env
```

In main.py, go through endpoints, they have example curls to test the endpoints.

## Project structure

- `core/`: shared scaffolding (state schemas, the `BaseAgent` that wires LangGraph memory, and helpers)
- `agents/`: individual agent packages such as `content_workflow`, `blog_workflow`, `multipurpose_bot`, `kafka_story`, and the new `newsroom` workflow
- `config/`: typed settings + environment management
- `data/`, `notes.md`, `walkthroughs.pdf`: sample assets and reference material
- `main.py`: FastAPI surface that loads every agent, compiles LangGraph graphs, and exposes endpoints

Each agent subclasses `core.base_agent.BaseAgent`, implements `get_state_schema`, wires a `StateGraph`, and returns a standardized `{response, metadata, package}` payload so the API can remain uniform across workflows.

## Newsroom agent & endpoint

- Purpose: research a topic with Tavily, produce a newsroom-style outline, and spin up tailored assets for modalities like news article, Medium essay, and LinkedIn post.
- Endpoint: `POST /newsroom`
- Body:

```json
{
  "brief": "Summarize the surge in EV battery policy",
  "modalities": ["news_article", "linkedin", "medium"],
  "tone": "analytical yet optimistic"
}
```

- Response: `summary`, `thread_id`, and a `package` containing sources, research digest, outline, and the drafted assets.
- Requirements: set `TAVILY_API_KEY` in `.env` so the workflow can hit web search.
