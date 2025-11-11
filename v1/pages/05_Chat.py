import uuid

import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response
from ui.state import get_session_store

render_sidebar()

st.title("Chat Endpoint `/chat`")
st.write("Send free-form prompts to any agent and keep the thread alive between turns.")

agent_options = ["multipurpose", "content", "kafka_story", "blog_workflow", "newsroom"]
agent_type = st.selectbox("Agent", options=agent_options, index=0)

chat_sessions = get_session_store("chat_sessions", dict)
if agent_type not in chat_sessions:
    chat_sessions[agent_type] = {
        "thread_id": str(uuid.uuid4()),
        "history": [],
        "last_payload": None,
        "last_response": None,
    }

session = chat_sessions[agent_type]

col1, col2 = st.columns(2)
col1.caption(f"Active thread: `{session['thread_id']}`")
if col2.button("Start new thread", use_container_width=True, key=f"new_thread_{agent_type}"):
    session["thread_id"] = str(uuid.uuid4())
    session["history"] = []
    session["last_payload"] = None
    session["last_response"] = None
    st.toast(f"Started new thread for {agent_type}")

chat_container = st.container()
for entry in session["history"]:
    with chat_container.chat_message(entry["role"]):
        st.markdown(entry["content"])

prompt = st.chat_input("Message the agent")

if prompt:
    payload = {
        "message": prompt,
        "agent_type": agent_type,
        "thread_id": session["thread_id"],
    }
    try:
        response = call_api("/chat", method="POST", payload=payload)
    except APIClientError as exc:
        show_error(f"Chat request failed: {exc}")
    else:
        agent_reply = response.data.get("response", "")
        session["thread_id"] = response.data.get("thread_id", session["thread_id"])
        session["history"].append({"role": "user", "content": prompt})
        session["history"].append({"role": "assistant", "content": agent_reply})
        session["last_payload"] = payload
        session["last_response"] = response.data
        st.rerun()

if session.get("last_response"):
    show_request_response(
        title="Most recent /chat exchange",
        response_data=session["last_response"],
        request_payload=session["last_payload"],
        endpoint="/chat",
    )
