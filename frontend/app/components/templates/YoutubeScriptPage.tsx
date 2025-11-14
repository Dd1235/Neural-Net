"use client";
import React, { useState, useCallback } from "react";
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";
import ModalitySelector, { Modality } from "../generate/ModalitySelector";
import WordCountInput from "../generate/WordCountInput";
import { Lightbulb } from "lucide-react";

const ALL_CHANNELS: Modality[] = [
  { name: "medium" },
  { name: "linkedin" },
  { name: "twitter" },
  { name: "facebook" },
  { name: "threads" },
  { name: "instagram" },
];

const YoutubeScriptPage: React.FC = () => {
  const [formData, setFormData] = useState({
    channelDescription: "",
    prompt: "",
    subscribers: "",
    videoType: "shortform",
    tone: "",
    audience: "",
    threadId: "e.g. session-abc123",
  });

  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/generate-youtube-script`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      console.log("Full JSON response from backend:", data);
      const format_blog = data.generated_script;
      const tid = data.threadId;
      // const formattedBlog = data?.data?.formatted_blog ?? "⚠️ No content generated";
      setResult(data.generated_script);

      // Save blog to DB (optional)
    //   try {
    //     await fetch("/api/save-blog", {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({
    //         threadId: tid,
    //         result: format_blog,
    //         url: "",
    //       }),
    //       credentials: "include",
    //     });
    //     console.log("Saved blog to DB successfully");
    //   } catch (err) {
    //     console.error("Failed to save blog:", err);
    //   }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      setResult("⚠️ Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 md:p-10 text-white max-w-4xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-2">
        Dashboard / Youtube Script{" "}
        <span className="text-gray-400 font-normal text-xl">
          /generate_youtube_script
        </span>
      </h1>
      <p className="text-gray-400 mb-8">
        Create a script for youtube videos.
      </p>

      <InputCard title="Channel Description">
        <TextInput
          label="Define your channel persona and tone."
          value={formData.channelDescription}
          onChange={(e) => handleChange("channelDescription", e.target.value)}
        />
      </InputCard>

      <InputCard title="Content">
        <TextInput
          label="Prompt"
          value={formData.prompt}
          onChange={(e) => handleChange("prompt", e.target.value)}
          placeholder="What should the agent write about?"
          isTextArea
        />
      </InputCard>

      <InputCard title="Subscribers">
        <TextInput
          label=""
          value={formData.subscribers}
          onChange={(e) => handleChange("subscribers", e.target.value)}
          placeholder="600k"
        />
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
      
      <InputCard title="Video Type">
        <div className="flex gap-4">
        <label className="flex items-center gap-2">
            <input
                type="radio"
                name="videoType"
                value="longform"
                checked={formData.videoType === "longform"}
                onChange={(e) => handleChange("videoType", e.target.value)}
            />
            Longform
        </label>

        <label className="flex items-center gap-2">
            <input
                type="radio"
                name="videoType"
                value="shortform"
                checked={formData.videoType === "shortform"}
                onChange={(e) => handleChange("videoType", e.target.value)}
            />
            Shortform
            </label>
            </div>
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
          {loading ? "Generating..." : "Youtube Script "}
        </button>
      </div>

      {result && (
        <div className="mt-10 bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-3">Generated Youtube Script:</h2>
          <pre className="whitespace-pre-wrap text-gray-200">{result}</pre>
        </div>
      )}
    </form>
  );
};

export default YoutubeScriptPage;
