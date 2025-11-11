import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Blog Workflow `/blog-workflow`")
st.write("Walk through the detailed blog creation path.")

with st.form("blog_form"):
    brief = st.text_area("Brief", value="Need a blog on the future of remote work.")
    topic = st.text_input("Topic", value="The Future of Remote Work")
    word_count = st.text_input("Target word count", value="1000")
    tone = st.text_input("Tone", value="forward-looking and pragmatic")
    audience = st.text_input("Audience", value="business decision makers")
    thread_id = st.text_input("Thread ID (optional)")
    submitted = st.form_submit_button("Run workflow", type="primary")

if submitted:
    if not brief.strip():
        show_error("Brief cannot be empty.")
    else:
        payload = {
            "brief": brief.strip(),
            "topic": topic.strip() or None,
            "word_count": int(word_count) if word_count.strip().isdigit() else None,
            "tone": tone.strip() or None,
            "audience": audience.strip() or None,
            "thread_id": thread_id.strip() or None,
        }
        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            response = call_api("/blog-workflow", method="POST", payload=payload)
            show_request_response(
                title="Blog workflow result",
                response_data=response.data,
                request_payload=payload,
                endpoint="/blog-workflow",
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

