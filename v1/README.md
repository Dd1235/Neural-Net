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
