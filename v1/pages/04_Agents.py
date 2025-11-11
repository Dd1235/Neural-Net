import streamlit as st

from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Agents Endpoint `/agents`")
st.write("Inspect which agents are loaded, compiled, and whether memory is enabled.")

if st.button("List agents", type="primary"):
    try:
        response = call_api("/agents")
        show_request_response(
            title="Agents",
            response_data=response.data,
            request_payload={"method": "GET"},
            endpoint="/agents",
        )

        agents = response.data.get("agents", {})
        if agents:
            st.dataframe(
                [
                    {
                        "Agent": name,
                        "Display name": details.get("name"),
                        "Compiled": details.get("compiled"),
                        "Has memory": details.get("memory_enabled"),
                    }
                    for name, details in agents.items()
                ],
                use_container_width=True,
            )
    except APIClientError as exc:
        show_error(f"Request failed: {exc}")

