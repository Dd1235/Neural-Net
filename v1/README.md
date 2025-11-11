Don't bother with the chat, content, kafka story endpoints
I just made them for learning and experimenting.
Backend is going to be stateless monolithic.

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

Web Search works
![ss1](./assets/ss1.png)

## Streamlit temporary frontend

Interact with FastAPI endpoint through a Streamlit UI:

```bash
uvicorn main:app --reload --port 8000
streamlit run streamlit_app.py
```
