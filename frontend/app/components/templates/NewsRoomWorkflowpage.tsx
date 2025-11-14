"use client";
import React, { useState, useCallback } from "react";
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";
import ModalitySelector, { Modality } from "../generate/ModalitySelector";
import WordCountInput from "../generate/WordCountInput";
import { Lightbulb, Clipboard, Check } from "lucide-react";

const NewsRoomWorkflowPage: React.FC = () => {
  const [formData, setFormData] = useState({
    prompt: "",
    existingDraft: "", // For additional context or a draft to rewrite
    articleWordCount: 800, // Single word count for the article
    tone: "",
    audience: "",
    threadId: "e.g. session-abc123",
  });

  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = useCallback(
    (key: keyof typeof formData, value: string | number | string[]) => {
      // Handle WordCountInput which returns a number
      if (key === "articleWordCount" && typeof value !== "number") {
        const numValue = parseInt(value as string, 10);
        setFormData((prev) => ({
          ...prev,
          [key]: isNaN(numValue) ? 0 : numValue,
        }));
      } else {
        setFormData((prev) => ({ ...prev, [key]: value }));
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Call backend to generate blog
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/generate-news-article`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      console.log("Full JSON response from backend:", data);
      // const formattedBlog = data?.data?.formatted_blog ?? "⚠️ No content generated";
      setResult(data.generated_article);

      // Save blog to DB (optional)
      try {
        await fetch("/api/save-news-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: data.threadId,
            result: data.generated_article,
            url: "",
          }),
          credentials: "include",
        });
        console.log("Saved blog to DB successfully");
      } catch (err) {
        console.error("Failed to save news-article:", err);
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setResult("⚠️ Failed to connect to backend");
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
        Dashboard / NewsRoom Workflow{" "}
        <span className="text-gray-400 font-normal text-xl">
          /generate-news-article
        </span>
      </h1>
      <p className="text-gray-400 mb-8">
        Generate a news article on a given topic using your agent.
      </p>

      {/* --- Article Content --- */}
      <InputCard title="Article Content">
        <TextInput
          label="Topic / Prompt"
          value={formData.prompt}
          onChange={(e) => handleChange("prompt", e.target.value)}
          placeholder="What is the news story about? (e.g., 'A new AI breakthrough in healthcare')"
        />
        <TextInput
          label="Additional Context / Draft (optional)"
          value={formData.existingDraft}
          onChange={(e) => handleChange("existingDraft", e.target.value)}
          placeholder="Paste any background info, data, or an existing draft to improve..."
          isTextArea
        />
      </InputCard>

      {/* --- Article Parameters --- */}
      <InputCard title="Article Parameters">
        <WordCountInput
          label="Article Word Count"
          value={formData.articleWordCount}
          onChange={(val) => handleChange("articleWordCount", val)}
        />
        <TextInput
          label="Tone"
          value={formData.tone}
          onChange={(e) => handleChange("tone", e.target.value)}
          placeholder="e.g., Objective, formal, investigative"
        />
        <TextInput
          label="Audience"
          value={formData.audience}
          onChange={(e) => handleChange("audience", e.target.value)}
          placeholder="e.g., General public, industry experts"
        />
      </InputCard>

      {/* --- Thread ID --- */}
      <InputCard title="Thread ID (optional)">
        <TextInput
          label="Continue an existing agent session"
          value={formData.threadId}
          onChange={(e) => handleChange("threadId", e.target.value)}
          placeholder="e.g. session-abc123"
        />
      </InputCard>

      {/* --- Submit Button --- */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center"
        >
          <Lightbulb className="w-5 h-5 mr-3" />
          {loading ? "Generating..." : "Generate News Article"}
        </button>
      </div>

      {/* --- Result Section --- */}
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
    </form>
  );
};

export default NewsRoomWorkflowPage;
