import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Newsroom Workflow `/newsroom`")
st.write("Spin up newsroom-ready assets across multiple modalities.")

with st.form("newsroom_form"):
    brief = st.text_area("Brief", value="Summarize EV battery policy shifts.")
    topic = st.text_input("Topic (optional)")
    modalities = st.multiselect(
        "Modalities",
        options=["news_article", "medium", "linkedin"],
        default=["news_article", "linkedin"],
    )
    tone = st.text_input("Tone", value="journalistic with a hopeful twist")
    audience = st.text_input("Audience", value="EV enthusiasts")
    timeframe = st.text_input("Timeframe (optional)", placeholder="e.g. Last 48 hours")
    thread_id = st.text_input("Thread ID (optional)")
    submitted = st.form_submit_button("Generate newsroom assets", type="primary")

if submitted:
    if not brief.strip():
        show_error("Brief cannot be empty.")
    else:
        payload = {
            "brief": brief.strip(),
            "topic": topic.strip() or None,
            "modalities": modalities or ["news_article"],
            "tone": tone.strip() or None,
            "audience": audience.strip() or None,
            "timeframe": timeframe.strip() or None,
            "thread_id": thread_id.strip() or None,
        }
        payload = {k: v for k, v in payload.items() if v not in (None, "", [])}

        try:
            response = call_api("/newsroom", method="POST", payload=payload)
            show_request_response(
                title="Newsroom response",
                response_data=response.data,
                request_payload=payload,
                endpoint="/newsroom",
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

