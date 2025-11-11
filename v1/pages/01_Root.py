import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Root Endpoint `/`")
st.write("Fetch the welcome payload that lists all available agents and sample curls.")

if st.button("Fetch root payload", type="primary"):
    try:
        response = call_api("/")
        show_request_response(
            title="Root response",
            response_data=response.data,
            request_payload={"method": "GET"},
            endpoint="/",
        )
    except APIClientError as exc:
        show_error(f"Request failed: {exc}")

