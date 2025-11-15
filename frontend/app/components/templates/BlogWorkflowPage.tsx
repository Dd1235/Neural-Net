"use client";
import React, { useState, useCallback } from "react";
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";
import ModalitySelector, { Modality } from "../generate/ModalitySelector";
import WordCountInput from "../generate/WordCountInput";
import {
  Lightbulb,
  Clipboard,
  Check,
  Download,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

const ALL_CHANNELS: Modality[] = [
  { name: "medium" },
  { name: "linkedin" },
  { name: "twitter" },
  { name: "facebook" },
  { name: "threads" },
  { name: "instagram" },
];

const IMAGE_ENDPOINT =
  process.env.NEXT_PUBLIC_IMAGE_GENERATION ||
  "https://dd1235--nn-image-imagegenserver-generate-image.modal.run";

interface ImageResult {
  url: string;
  fileKey: string;
  prompt: string;
}

const BlogWorkflowPage: React.FC = () => {
  const [formData, setFormData] = useState({
    brandVoice: "",
    prompt: "",
    existingDraft: "",
    modalities: ["medium", "linkedin"] as string[],
    mediumWordCount: 600,
    linkedinWordCount: 200,
    tone: "",
    audience: "",
    threadId: "e.g. session-abc123",
  });

  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imagePromptLoading, setImagePromptLoading] = useState(false);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleChange = useCallback(
    (key: keyof typeof formData, value: string | number | string[]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSelectionChange = useCallback((selectedNames: string[]) => {
    setFormData((prev) => ({
      ...prev,
      modalities: selectedNames,
    }));
  }, []);

  const autoGenerateImagePrompt = useCallback(async () => {
    setImagePromptLoading(true);
    setImageError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("Python backend URL is not configured.");
      }
      const res = await fetch(`${backendUrl}/image-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_voice: formData.brandVoice,
          prompt: formData.prompt,
          existing_draft: formData.existingDraft,
          tone: formData.tone,
          audience: formData.audience,
        }),
      });
      if (!res.ok) {
        throw new Error(`Prompt helper failed (${res.status})`);
      }
      const data = await res.json();
      const promptText = data.image_prompt || data.prompt;
      if (!promptText) {
        throw new Error("No prompt returned by helper.");
      }
      setImagePrompt(promptText);
    } catch (err: any) {
      console.error("Image prompt helper error:", err);
      setImageError(
        err?.message || "Failed to craft image prompt from your content."
      );
    } finally {
      setImagePromptLoading(false);
    }
  }, [
    formData.brandVoice,
    formData.prompt,
    formData.existingDraft,
    formData.tone,
    formData.audience,
  ]);

  const generateImageFromPrompt = useCallback(
    async (promptText: string) => {
      if (!promptText.trim()) return null;

      try {
        const response = await fetch(IMAGE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Image API error (${response.status})`);
        }

        const payload = await response.json();
        const fileKey = payload.file_key || payload.fileKey || "";
        const publicUrl = payload.public_url || payload.publicUrl;

        if (!publicUrl) {
          throw new Error("Image service did not return a public URL.");
        }

        try {
          const saveRes = await fetch("/api/generated-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              prompt: promptText,
              fileKey,
              imageUrl: publicUrl,
            }),
          });

          if (!saveRes.ok && saveRes.status === 401) {
            setImageError("Login required to store generated images.");
          }
        } catch (saveErr) {
          console.error("Failed to save generated image:", saveErr);
        }

        return {
          url: publicUrl,
          fileKey,
          prompt: promptText,
        };
      } catch (err: any) {
        console.error("Image generation error:", err);
        setImageError(
          err?.message || "Failed to generate image from the provided prompt."
        );
        return null;
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setImageResult(null);
    setImageError(null);

    const imagePromise = imagePrompt.trim()
      ? generateImageFromPrompt(imagePrompt.trim())
      : Promise.resolve(null);

    try {
      // Call backend to generate blog
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/generate-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      console.log("Full JSON response from backend:", data);
      const format_blog = data.generated_blog;
      const tid = data.threadId;
      // const formattedBlog = data?.data?.formatted_blog ?? "⚠️ No content generated";
      setResult(data.generated_blog);

      // Save blog to DB (optional)
      try {
        await fetch("/api/save-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: tid,
            result: format_blog,
            url: "",
          }),
          credentials: "include",
        });
        console.log("Saved blog to DB successfully");
      } catch (err) {
        console.error("Failed to save blog:", err);
      }

      const generatedImage = await imagePromise;
      if (generatedImage) {
        setImageResult(generatedImage);
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setResult("⚠️ Failed to connect to backend");
      await imagePromise;
    } finally {
      setLoading(false);
    }
  };

  // Function to copy text to clipboard
  const handleCopy = () => {
    if (!result) return;

    // Use document.execCommand for compatibility in restricted environments (like iframes)
    const textArea = document.createElement("textarea");
    textArea.value = result;
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px"; // Move it off-screen
    document.body.appendChild(textArea);

    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }

    document.body.removeChild(textArea);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 md:p-10 text-white max-w-4xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-2">
        Dashboard / Blog Workflow{" "}
        <span className="text-gray-400 font-normal text-xl">
          /generate_blog
        </span>
      </h1>
      <p className="text-gray-400 mb-8">
        Create branded multi-platform blog posts using your agent.
      </p>

      <InputCard title="Brand / Voice">
        <TextInput
          label="Define your brand persona and tone."
          value={formData.brandVoice}
          onChange={(e) => handleChange("brandVoice", e.target.value)}
          isTextArea
        />
      </InputCard>

      <InputCard title="Content">
        <TextInput
          label="Prompt"
          value={formData.prompt}
          onChange={(e) => handleChange("prompt", e.target.value)}
          placeholder="What should the agent write about?"
        />
        <TextInput
          label="Existing Draft (optional)"
          value={formData.existingDraft}
          onChange={(e) => handleChange("existingDraft", e.target.value)}
          isTextArea
        />
      </InputCard>

      <InputCard title="Image Prompt">
        <div className="space-y-3">
          <TextInput
            label="Describe the hero image you'd like the SDXL model to create."
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            isTextArea
            placeholder="e.g. Ultra-detailed cinematic shot of..."
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={autoGenerateImagePrompt}
              disabled={imagePromptLoading || loading}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition disabled:opacity-60"
            >
              {imagePromptLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Crafting prompt...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Suggest from brief
                </>
              )}
            </button>
            <p className="text-xs text-gray-400">
              The lightbulb uses your brand voice + content brief to craft an SDXL-ready prompt.
            </p>
          </div>
          {imageError && (
            <p className="text-xs text-red-300">{imageError}</p>
          )}
        </div>
      </InputCard>

      <ModalitySelector
        allChannels={ALL_CHANNELS}
        preSelectedNames={formData.modalities}
        onSelectionChange={handleSelectionChange}
      />

      <InputCard title="Word Counts per Modality">
        {formData.modalities.map((modality) => {
          const key = `${modality}WordCount` as keyof typeof formData;
          const value =
            typeof formData[key] === "number" ? (formData[key] as number) : 0;
          return (
            <WordCountInput
              key={modality}
              label={`${
                modality.charAt(0).toUpperCase() + modality.slice(1)
              } word count`}
              value={value}
              onChange={(val) => handleChange(key, val)}
            />
          );
        })}
      </InputCard>

      <InputCard title="Tone">
        <TextInput
          label=""
          value={formData.tone}
          onChange={(e) => handleChange("tone", e.target.value)}
          placeholder="inquisitive"
        />
      </InputCard>

      <InputCard title="Audience">
        <TextInput
          label=""
          value={formData.audience}
          onChange={(e) => handleChange("audience", e.target.value)}
          placeholder="middle aged men"
        />
      </InputCard>

      <InputCard title="Thread ID (optional)">
        <TextInput
          label=""
          value={formData.threadId}
          onChange={(e) => handleChange("threadId", e.target.value)}
          placeholder="e.g. session-abc123"
        />
      </InputCard>

      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center"
        >
          <Lightbulb className="w-5 h-5 mr-3" />
          {loading ? "Generating..." : "Generate Blog Assets"}
        </button>
      </div>

      {result && (
        <div className="mt-10 bg-gray-800 rounded-xl shadow-lg relative">
          {/* Header with Copy Button */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold">Generated Article:</h2>
            <button
              type="button" // Important: type="button" to prevent form submission
              onClick={handleCopy}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-gray-200"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Clipboard className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Article Content */}
          <div className="p-6">
            <pre className="whitespace-pre-wrap text-gray-200 font-sans">
              {result}
            </pre>
          </div>
        </div>
      )}

      {imageResult && (
        <div className="mt-8 bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-red-400" />
                Generated Image
              </h3>
              <p className="text-sm text-gray-400">
                Prompt: <span className="text-gray-200">{imageResult.prompt}</span>
              </p>
            </div>
            <a
              href={imageResult.url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
          </div>
          <div className="bg-black/40 rounded-lg overflow-hidden border border-gray-700">
            <img
              src={imageResult.url}
              alt="Generated visual asset"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      )}

    </form>
  );
};

export default BlogWorkflowPage;
