import streamlit as st

from ui.components import render_sidebar

st.set_page_config(
    page_title="LangGraph Agent Frontend",
    page_icon="🧩",
    layout="wide",
)

render_sidebar()

st.title("LangGraph Agent Frontend")
st.write(
    """
    Use the navigation sidebar to open a dedicated page for every FastAPI endpoint.
    Each page surfaces the exact payload sent to the backend and streams the raw response
    so you can debug or iterate quickly.
    """
)

st.markdown(
    """
    ### How to use
    1. **Start the API** – `uvicorn main:app --reload --port 8000`
    2. **Launch the UI** – `streamlit run streamlit_app.py`
    3. **Pick an endpoint page** from the sidebar and submit requests.

    Chat sessions preserve their `thread_id` so you can continue conversations or
    start fresh threads with one click.
    """
)

st.info(
    "Need to change environments? Use the sidebar control to point the UI at any running FastAPI instance."
)

