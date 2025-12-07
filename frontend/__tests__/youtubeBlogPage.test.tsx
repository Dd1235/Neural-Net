import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import YouTubeBlogPage from "@/app/components/templates/YouTubeBlogPage";

describe("YouTubeBlogPage", () => {
  const originalEnv = process.env;
  const backendUrl = "http://backend";

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_PYTHON_BACKEND_URL: backendUrl };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  it("sends video details to the backend and renders the returned summary + blog", async () => {
    const fetchMock = jest.fn(
      (url: RequestInfo | URL, options?: RequestInit) => {
        if (String(url).includes("/youtube-blog")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              metadata: { title: "Test Video Title", channel: "NN Channel" },
              blog_post: "Expanded blog draft from the transcript",
              summary: "Tight recap of the video",
              video_url: "https://www.youtube.com/watch?v=123",
              word_count: 650,
              transcript: "Full transcript here",
            }),
          });
        }

        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<YouTubeBlogPage />);

    await userEvent.type(
      screen.getByPlaceholderText(/youtube\.com\/watch/i),
      "https://www.youtube.com/watch?v=123"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Describe the POV or themes/i),
      "Focus on the main takeaways"
    );
    const wordCountInput = screen.getByDisplayValue("600");
    await userEvent.clear(wordCountInput);
    await userEvent.type(wordCountInput, "650");

    await userEvent.click(
      screen.getByRole("button", { name: /generate blog/i })
    );

    await screen.findByText(/Test Video Title/);
    await screen.findByText(/Tight recap of the video/);
    await screen.findByText(/Expanded blog draft from the transcript/);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/youtube-blog");
    const payload = JSON.parse((options?.body as string) || "{}");
    expect(payload).toMatchObject({
      youtube_url: "https://www.youtube.com/watch?v=123",
      prompt: "Focus on the main takeaways",
      word_count: 650,
    });
  });
});
