"use client";
import React, { useState, useCallback } from "react";
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";
import ModalitySelector, { Modality } from "../generate/ModalitySelector";
import WordCountInput from "../generate/WordCountInput";
import { Lightbulb, Clipboard, Check } from "lucide-react";

const ALL_CHANNELS: Modality[] = [
  { name: "medium" },
  { name: "linkedin" },
  { name: "twitter" },
  { name: "facebook" },
  { name: "threads" },
  { name: "instagram" },
];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

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
    </form>
  );
};

export default BlogWorkflowPage;
