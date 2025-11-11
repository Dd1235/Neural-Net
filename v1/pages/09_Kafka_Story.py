import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Kafka Story `/kafka-story`")
st.write("Generate a surreal Kafka-esque snippet with one click.")

story_prompt = st.text_area(
    "Story seed",
    value="A QA engineer wakes up inside a spreadsheet that will not balance.",
)
thread_id = st.text_input("Thread ID (optional)")

if st.button("Create story", type="primary"):
    if not story_prompt.strip():
        show_error("Prompt cannot be empty.")
    else:
        payload = {
            "message": story_prompt.strip(),
            "agent_type": "kafka_story",
            "thread_id": thread_id.strip() or None,
        }
        if payload["thread_id"] is None:
            payload.pop("thread_id")
        try:
            response = call_api("/kafka-story", method="POST", payload=payload)
            show_request_response(
                title="Kafka agent response",
                response_data=response.data,
                request_payload=payload,
                endpoint="/kafka-story",
            )
            text = response.data.get("response")
            if text:
                st.markdown("#### Story")
                st.write(text)
        except APIClientError as exc:
            show_error(f"Request failed: {exc}")

