import streamlit as st
from ui.api_client import APIClientError, call_api
from ui.components import render_sidebar, show_error, show_request_response

render_sidebar()

st.title("Blog Workflow `/generate_blog`")
st.write("Create branded multi-platform blog posts using your backend agent.")

with st.form("blog_form"):
    brand = st.text_input(
        "Brand / Voice",
        value="We’re an eco-friendly lifestyle brand that balances science with heart. Write like a caring friend who knows sustainability deeply.",
    )
    prompt = st.text_area(
        "Prompt",
        value="Announce our new plastic-free shampoo bar with a focus on how it saves water.",
    )
    draft = st.text_area(
        "Existing Draft (optional)",
        value="Try our new bar! It’s zero-waste and lasts longer. It has not sulphates, and uses chemicals that aren't too hard on new!",
        height=150,
    )

    modalities = st.multiselect(
        "Modalities",
        options=["medium", "linkedin"],
        default=["medium", "linkedin"],
    )

    st.markdown("### ✍️ Word Counts per Modality")
    word_counts = {}
    for m in modalities:
        default_wc = 600 if m == "medium" else 200
        word_counts[m] = st.number_input(
            f"{m.capitalize()} word count",
            min_value=50,
            max_value=2000,
            value=default_wc,
            key=f"wc_{m}",
        )

    thread_id = st.text_input("Thread ID (optional)", placeholder="e.g. session-abc123")
    submitted = st.form_submit_button("Generate Blog Assets", type="primary")

if submitted:
    if not prompt.strip():
        show_error("Prompt cannot be empty.")
    else:
        payload = {
            "brand": brand.strip() or None,
            "prompt": prompt.strip(),
            "modalities": modalities or ["medium"],
            "word_counts": word_counts or {},
            "thread_id": thread_id.strip() or None,
            "original_draf": draft.strip() or None,
        }
        payload = {k: v for k, v in payload.items() if v not in (None, "", [], {})}

        try:
            response = call_api("/generate_blog", method="POST", payload=payload)
            show_request_response(
                title="Blog generation response",
                response_data=response.data,
                request_payload=payload,
                endpoint="/generate_blog",
            )
            drafts = response.data.get("drafts", {})
            if drafts:
                st.markdown("#### ✏️ Generated Drafts")

                for mod, text in drafts.items():
                    with st.expander(f"{mod.capitalize()} Draft", expanded=True):
                        st.write("##### 💬 Preview")
                        st.write(text)

                        st.write("##### 📋 Copy")
                        st.text_area(
                            label=f"Copy-ready {mod.capitalize()} Draft",
                            value=text,
                            height=200,
                            key=f"copy_{mod}",
                        )

            hero_image = response.data.get("hero_image_url")
            if hero_image:
                st.image(hero_image, caption="Hero Image", use_container_width=True)

        except APIClientError as exc:
            show_error(f"Request failed: {exc}")
