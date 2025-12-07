import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import XPostWorkflowPage from "@/app/components/templates/XPostWorkflowPage";

describe("XPostWorkflowPage", () => {
  const originalEnv = process.env;
  const backendUrl = "http://backend";

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_PYTHON_BACKEND_URL: backendUrl };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  it("runs the workflow and surfaces the final post", async () => {
    const fetchMock = jest.fn(
      (url: RequestInfo | URL, options?: RequestInit) => {
        if (String(url).includes("/x-post/generate")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              iterations: [],
              feedback_threads: [],
              final_post: "Optimized tweet ready to post",
              audit_trail: {
                total_iterations: 1,
                word_limit: 180,
                models: { generator: "llama" },
              },
            }),
          });
        }

        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<XPostWorkflowPage currentUser={null} />);

    const topicInput = screen.getByPlaceholderText(
      /launching latency-free inference/i
    );
    await userEvent.clear(topicInput);
    await userEvent.type(topicInput, "AI launch announcement");

    const objectiveInput = screen.getByPlaceholderText(
      /Drive waitlist signups/i
    );
    await userEvent.clear(objectiveInput);
    await userEvent.type(objectiveInput, "Drive waitlist signups");

    const audienceInput = screen.getByPlaceholderText(
      /Developers, founders, AI researchers/i
    );
    await userEvent.clear(audienceInput);
    await userEvent.type(audienceInput, "Technical founders");

    const keywordsInput = screen.getByPlaceholderText(/AI infra/i);
    await userEvent.clear(keywordsInput);
    await userEvent.type(keywordsInput, "AI, growth");

    const spinbuttons = screen.getAllByRole("spinbutton");
    const [wordLimitInput, maxIterationsInput] = spinbuttons;
    await userEvent.clear(wordLimitInput);
    await userEvent.type(wordLimitInput, "180");
    await userEvent.clear(maxIterationsInput);
    await userEvent.type(maxIterationsInput, "3");

    const feedbackMessage = screen.getByPlaceholderText(
      /Mention daily active users/i
    );
    await userEvent.clear(feedbackMessage);
    await userEvent.type(feedbackMessage, "Keep emoji usage minimal.");

    await userEvent.click(
      screen.getByRole("button", { name: /run x post workflow/i })
    );

    await screen.findByText(/Optimized tweet ready to post/);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/x-post/generate");
    const payload = JSON.parse((options?.body as string) || "{}");

    expect(payload).toMatchObject({
      topic: "AI launch announcement",
      objective: "Drive waitlist signups",
      audience: "Technical founders",
      keywords: ["AI", "growth"],
      word_limit: 180,
      max_iterations: 3,
    });
    expect(payload.human_feedback?.[0]?.message).toContain(
      "Keep emoji usage minimal."
    );
  });
});
