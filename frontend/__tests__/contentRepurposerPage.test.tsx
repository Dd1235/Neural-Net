import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentRepurposerPage from "@/app/components/templates/ContentRepurposerPage";

const MAMMOTH_SCRIPT_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.11.0/mammoth.browser.min.js";

describe("ContentRepurposerPage", () => {
  const originalEnv = process.env;
  const backendUrl = "http://backend";

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_PYTHON_BACKEND_URL: backendUrl };
    (window as any).mammoth = { extractRawText: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  it("submits pasted article text and renders repurposed outputs", async () => {
    const fetchMock = jest.fn(
      (url: RequestInfo | URL, options?: RequestInit) => {
        if (String(url).includes("/repurpose-article")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              repurposed_content: {
                summary: "Key points summary",
                social_posts: {
                  twitter: "Tweet draft",
                  linkedin: "LinkedIn draft",
                  instagram: "IG caption",
                },
                faq_section: "FAQ content",
                entities: {
                  people: ["Alice", "Bob"],
                  organizations: ["Neural Net"],
                  topics: ["AI"],
                },
              },
            }),
          });
        }

        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ContentRepurposerPage />);

    act(() => {
      const mammothScript = document.querySelector(
        `script[src="${MAMMOTH_SCRIPT_SRC}"]`
      ) as HTMLScriptElement | null;
      mammothScript?.onload?.(new Event("load"));
    });

    const repurposeButton = await screen.findByRole("button", {
      name: /repurpose content/i,
    });
    expect(repurposeButton).toBeEnabled();

    await userEvent.type(
      screen.getByPlaceholderText(/Start pasting your article here/i),
      "Sample article body for repurposing"
    );

    await userEvent.click(repurposeButton);

    await screen.findByText(/Key points summary/);
    await userEvent.click(screen.getByRole("button", { name: /social posts/i }));
    await screen.findByText(/Twitter/i);
    await screen.findByText(/Tweet draft/);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/repurpose-article");
    const payload = JSON.parse((options?.body as string) || "{}");
    expect(payload).toEqual({
      article_text: "Sample article body for repurposing",
    });
  });
});
