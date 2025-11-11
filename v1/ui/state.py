import os
from typing import Optional

import streamlit as st


DEFAULT_API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


def get_api_base_url() -> str:
    """Return the persisted API base URL."""
    if "api_base_url" not in st.session_state or not st.session_state["api_base_url"]:
        st.session_state["api_base_url"] = DEFAULT_API_BASE_URL
    return st.session_state["api_base_url"].rstrip("/")


def set_api_base_url(url: Optional[str]) -> None:
    """Persist a new base URL in session state."""
    if url:
        st.session_state["api_base_url"] = url.rstrip("/")


def get_session_store(key: str, default):
    """Helper to manage nested session data."""
    if key not in st.session_state:
        st.session_state[key] = default() if callable(default) else default
    return st.session_state[key]

