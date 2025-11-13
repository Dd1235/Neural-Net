"use client";
import React, { useState, useCallback } from "react";
// Assuming paths are correct
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";
import ModalitySelector, { Modality } from "../generate/ModalitySelector"; // Import the updated component
import WordCountInput from "../generate/WordCountInput";
import { Lightbulb } from "lucide-react";

// Define the full list of available channels to pass to the selector
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
    brandVoice:
      "",
    prompt:
      "",
    existingDraft:
      "",
    // 💡 FIX 1: The modalities state should be an array of names (strings) for easy API submission.
    modalities: [
      "medium", // Previously active
      "linkedin", // Adding a channel to start with
    ] as string[], // Now stores only the selected NAMES
    mediumWordCount: 600,
    linkedinWordCount: 200,
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
        
        process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL + "/generate-blog",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      console.log("Full JSON response from backend:", data); // 👈 log the entire JSON
      setResult(data.generated_blog); // fallback if key doesn't exist

    } catch (error) {
      console.log(process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL);
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
        Dashboard / Blog Workflow{" "}
        <span className="text-gray-400 font-normal text-xl">
          /generate_blog
        </span>
      </h1>
      <p className="text-gray-400 mb-8">
        Create branded multi-platform blog posts using your agent.
      </p>

      {/* ... other InputCard components ... */}
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
      
      {/* 💡 FIX 3: Updated ModalitySelector usage */}
      <ModalitySelector
        allChannels={ALL_CHANNELS} // Pass the full list of options
        preSelectedNames={formData.modalities} // Pass the currently selected names
        onSelectionChange={handleSelectionChange} // Use the new handler
      />

      <InputCard title="Word Counts per Modality">
        {formData.modalities.map((modality) => {
        // Build the corresponding key dynamically
        const key = `${modality}WordCount` as keyof typeof formData;
        const value = typeof formData[key] === "number" ? (formData[key] as number) : 0;
        return (
          <WordCountInput
          key={modality}
          label={`${modality.charAt(0).toUpperCase() + modality.slice(1)} word count`}
          value={value}
          onChange={(val) => handleChange(key, val)}
        />
        );
        })}
      </InputCard>

      <InputCard title="tone">
        <TextInput
          label=""
          value={formData.tone}
          onChange={(e) => handleChange("tone", e.target.value)}
          placeholder="inquisitive"
        />
      </InputCard>

      <InputCard title="audience">
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

export default BlogWorkflowPage;