import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Content Workflow `/content`")
st.write("Trigger the multi-asset content agent and inspect the returned package.")

with st.form("content_form"):
    brief = st.text_area("Creative brief", help="Describe the campaign or request.")
    primary_asset = st.selectbox("Primary asset", ["blog", "newsletter"], index=0)
    secondary_channels = st.multiselect(
        "Secondary channels",
        options=["linkedin", "instagram", "twitter", "facebook", "threads"],
        default=["linkedin", "instagram"],
    )
    word_count = st.text_input("Word count (optional)", placeholder="e.g. 1200")
    tone = st.text_input("Tone", value="uplifting and authoritative")
    audience = st.text_input("Audience", value="founders")
    thread_id = st.text_input("Thread ID (optional)")
    submitted = st.form_submit_button("Generate content", type="primary")

if submitted:
    if not brief.strip():
        show_error("Brief cannot be empty.")
    else:
        payload = {
            "brief": brief.strip(),
            "primary_asset": primary_asset,
            "secondary_channels": secondary_channels or ["linkedin"],
            "word_count": int(word_count) if word_count.strip().isdigit() else None,
            "tone": tone or None,
            "audience": audience or None,
            "thread_id": thread_id or None,
        }
        if payload["word_count"] is None:
            payload.pop("word_count")
        if payload["thread_id"] is None:
            payload.pop("thread_id")
        try:
            response = call_api("/content", method="POST", payload=payload)
            show_request_response(
                title="Content workflow result",
                response_data=response.data,
                request_payload=payload,
                endpoint="/content",
            )
            summary = response.data.get("summary")
            if summary:
                st.markdown("#### Summary")
                st.write(summary)
            package = response.data.get("package")
            if package:
                st.markdown("#### Package")
                st.json(package)
        except APIClientError as exc:
            show_error(f"Request failed: {exc}")
