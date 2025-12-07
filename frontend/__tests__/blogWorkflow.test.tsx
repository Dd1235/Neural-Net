import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BlogWorkflowPage from "@/app/components/templates/BlogWorkflowPage";

describe("BlogWorkflowPage", () => {
  const originalEnv = process.env;
  const backendUrl = "http://backend";

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_PYTHON_BACKEND_URL: backendUrl };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  it("submits blog generation without image prompt and shows the returned article", async () => {
    const fetchMock = jest.fn(
      (url: RequestInfo | URL, options?: RequestInit) => {
        if (String(url).includes("/generate-blog")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              generated_blog: "Launch blog result",
              threadId: "thread-123",
            }),
          });
        }

        if (String(url).includes("/api/save-blog")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ saved: true }),
          });
        }

        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<BlogWorkflowPage />);

    const brandVoiceInput = screen
      .getByText(/Define your brand persona and tone/i)
      .parentElement?.querySelector("textarea") as HTMLTextAreaElement;
    expect(brandVoiceInput).toBeInTheDocument();
    await userEvent.type(brandVoiceInput, "Bold, upbeat brand voice");

    await userEvent.type(
      screen.getByPlaceholderText(/What should the agent write about/i),
      "Write a launch blog for our AI app"
    );

    await userEvent.click(
      screen.getByRole("button", { name: /generate blog assets/i })
    );

    await screen.findByText("Launch blog result");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const generateCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/generate-blog")
    );
    expect(generateCall).toBeTruthy();
    const generatePayload = JSON.parse(
      (generateCall?.[1]?.body as string) || "{}"
    );
    expect(generatePayload).toMatchObject({
      brandVoice: "Bold, upbeat brand voice",
      prompt: "Write a launch blog for our AI app",
    });

    const imageCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("imagegen")
    );
    expect(imageCall).toBeUndefined();
  });
});
