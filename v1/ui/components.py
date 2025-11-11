import json
from typing import Any, Dict, Optional

import streamlit as st

from .api_client import APIClientError, call_api
from .state import get_api_base_url, set_api_base_url


def render_sidebar() -> None:
    """Render the shared sidebar with backend connection controls."""
    st.sidebar.header("Backend Connection")
    base_url_input = st.sidebar.text_input(
        "FastAPI base URL",
        value=get_api_base_url(),
        key="sidebar_base_url",
        help="Update this if your API is running on a different host/port.",
    )
    set_api_base_url(base_url_input)

    if st.sidebar.button("↻ Check /health", use_container_width=True):
        with st.sidebar:
            try:
                response = call_api("/health")
                st.success("Healthy")
                st.caption(json.dumps(response.data, indent=2))
            except APIClientError as exc:
                st.error(f"Health check failed: {exc}")

    st.sidebar.markdown(
        """
        <small>
        1. Start the FastAPI server (`uvicorn main:app --reload`).<br>
        2. Run the frontend: `streamlit run streamlit_app.py`.
        </small>
        """,
        unsafe_allow_html=True,
    )


def show_request_response(
    *,
    title: str,
    response_data: Any,
    request_payload: Optional[Dict[str, Any]] = None,
    endpoint: Optional[str] = None,
) -> None:
    """Render expandable sections for the payload and response."""
    st.subheader(title)
    if endpoint:
        st.caption(f"Endpoint: `{endpoint}`")

    if request_payload is not None:
        with st.expander("Request payload", expanded=False):
            st.code(json.dumps(request_payload, indent=2), language="json")

    with st.expander("Response", expanded=True):
        if isinstance(response_data, (dict, list)):
            st.code(json.dumps(response_data, indent=2), language="json")
        else:
            st.text(response_data)


def show_error(message: str) -> None:
    st.error(message)

