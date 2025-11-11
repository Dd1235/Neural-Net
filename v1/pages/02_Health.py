import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Health Endpoint `/health`")
st.write("Quickly confirm whether the agent manager initialized correctly.")

auto_fetch = st.checkbox("Fetch automatically", value=True)

def render_health():
    try:
        response = call_api("/health")
        show_request_response(
            title="Health response",
            response_data=response.data,
            request_payload={"method": "GET"},
            endpoint="/health",
        )
    except APIClientError as exc:
        show_error(f"Request failed: {exc}")


if auto_fetch:
    render_health()
else:
    if st.button("Run health check", type="primary"):
        render_health()

