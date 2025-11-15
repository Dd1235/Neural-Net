import asyncio
from agent_youtube_script import YoutubeScriptAgent

# Create agent instance
agent = YoutubeScriptAgent()
agent.compile()

async def run_test():
    # Mock frontend payload
    test_payload = {
        "channelDescription": "A channel about AI, tech, and productivity.",
        "prompt": "Why AI agents will replace traditional apps in 3 minutes",
        "subscribers": "120000",
        "videoType": "shortform",  # longform OR shortform
        "tone": "informative",
        "audience": "tech enthusiasts",
        "threadId": "test-session-123"
    }

    print("Sending test payload to YouTube Script Agent...")
    result = await agent.ainvoke(test_payload)

    print("\n=== RESULT ===")
    print("Status:", result.get("status"))
    print("Thread ID:", result.get("data", {}).get("threadId"))
    print("Revision Count:", result.get("data", {}).get("revision_count"))
    print("\nGenerated Script:\n")
    print(result.get("data", {}).get("script", ""))


# Run the async test
if __name__ == "__main__":
    asyncio.run(run_test())
