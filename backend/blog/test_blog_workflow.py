from blog_workflow_model import build_blog_graph, BlogState

def test_blog_generation():
    # Create the blog graph
    graph = build_blog_graph()

    # Define a sample topic & brief
    state = BlogState(
        topic="Gardening Tips for Beginners",
        brief="Give some easy, practical tips for home gardening and sustainability.",
        tone="friendly",
        audience="eco-conscious readers",
        word_count=500
    )

    # Run the workflow
    app = graph.compile()
    result = app.invoke(state)


    print("\n=== FINAL BLOG OUTPUT ===")
    print(result)

if __name__ == "__main__":
    test_blog_generation()
