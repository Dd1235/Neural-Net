"use client";
import React, { useState, useCallback } from "react";
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";
import ModalitySelector, { Modality } from "../generate/ModalitySelector";
import WordCountInput from "../generate/WordCountInput";
import { Angry, Lightbulb } from "lucide-react";

const ALL_CHANNELS: Modality[] = [
  { name: "medium" },
  { name: "linkedin" },
];

const NewsRoomWorkflowPage: React.FC = () => {
  const [formData, setFormData] = useState({
    brandVoice:
      "We're an eco-friendly lifestyle brand that balances science with heart. Write like a caring friend who knows sustainability, deeply.",
    prompt:
      "Announce our new plastic-free shampoo bar with a focus on how it conserves water.",
    existingDraft:
      "Try our new bar! It's zero-waste and lasts longer. It has no sulphates, and uses chemicals that aren't too hard on new!",
    // 💡 FIX 1: The modalities state should be an array of names (strings) for easy API submission.
    modalities: [
      "medium", // Previously active
      "linkedin", // Adding a channel to start with
    ] as string[], // Now stores only the selected NAMES
    tone: "angry",
    audience: "boomers",
    timeframe: "Eg: Last 48 hours",
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

  // 💡 FIX 2: Replaced handleToggleModality with a new handler
  const handleSelectionChange = useCallback((selectedNames: string[]) => {
    setFormData((prev) => ({
      ...prev,
      modalities: selectedNames, // Update state with the new array of selected names
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL + "/generate-news",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      setResult(data.generated_blog);
    } catch (error) {
      console.error("Error:", error);
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
        Dashboard / Newsroom{" "}
        <span className="text-gray-400 font-normal text-xl">
          /generate_news
        </span>
      </h1>
      <p className="text-gray-400 mb-8">
        Get latest news on any topic rapidly using AI
      </p>

      {/* ... other InputCard components ... */}
      <InputCard title="">
        <TextInput
          label="Brief."
          value={formData.brandVoice}
          onChange={(e) => handleChange("brandVoice", e.target.value)}
          isTextArea
        />
      </InputCard>

      <InputCard title="Topic(Optional)">
        <TextInput
          label=""
          value={formData.prompt}
          onChange={(e) => handleChange("prompt", e.target.value)}
          placeholder="What should the agent write about?"
        />
      </InputCard>
      
      {/* 💡 FIX 3: Updated ModalitySelector usage */}
      <ModalitySelector
        allChannels={ALL_CHANNELS} // Pass the full list of options
        preSelectedNames={formData.modalities} // Pass the currently selected names
        onSelectionChange={handleSelectionChange} // Use the new handler
      />

      <InputCard title="Tone">
        <TextInput
          label=""
          value={formData.tone}
          onChange={(e) =>( handleChange("tone", e.target.value))}
          placeholder="journalistic with a hpeful twist"
        />
      </InputCard>

      <InputCard title="Audience">
        <TextInput
          label=""
          value={formData.audience}
          onChange={(e) =>( handleChange("audience", e.target.value))}
          placeholder="middle aged women"
        />
      </InputCard>

      <InputCard title="Timeframe (optional)">
        <TextInput
          label=""
          value={formData.timeframe}
          onChange={(e) =>( handleChange("timeframe", e.target.value))}
          placeholder="Eg: Last 48hours"
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
          {loading ? "Generating..." : "Generate News"}
        </button>
      </div>

      {/* Result Section */}
      {result && (
        <div className="mt-10 bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-3">Generated Blog Output:</h2>
          <pre className="whitespace-pre-wrap text-gray-200">{result}</pre>
        </div>
      )}
    </form>
  );
};

export default NewsRoomWorkflowPage;
