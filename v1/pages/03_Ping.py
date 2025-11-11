import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Ping Endpoint `/ping`")
st.write("Simple pong check to verify connectivity.")

if st.button("Ping server", type="primary"):
    try:
        response = call_api("/ping")
        show_request_response(
            title="Ping response",
            response_data=response.data,
            request_payload={"method": "GET"},
            endpoint="/ping",
        )
    except APIClientError as exc:
        show_error(f"Request failed: {exc}")

