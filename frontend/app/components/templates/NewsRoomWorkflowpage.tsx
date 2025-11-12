"use client";
import React, { useState, useCallback } from "react";
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";
import ModalitySelector, { Modality } from "../generate/ModalitySelector";
import WordCountInput from "../generate/WordCountInput";
import { Lightbulb } from "lucide-react";

const NewsRoomWorkflowPage: React.FC = () => {
  const [formData, setFormData] = useState({
    brandVoice:
      "",
    prompt: "",
    existingDraft:
      "",
    modalities: [
      { name: "madGum", active: true },
      { name: "drakeGo", active: false },
    ] as Modality[],
    mediumWordCount: 600,
    linkedinWordCount: 200,
    threadId: "e.g. session-abc123",
  });

  const handleChange = useCallback(
    (key: keyof typeof formData, value: string | number | Modality[]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleToggleModality = useCallback((name: string) => {
    setFormData((prev) => ({
      ...prev,
      modalities: prev.modalities.map((m) =>
        m.name === name ? { ...m, active: !m.active } : m
      ),
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
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
        modalities={formData.modalities}
        onToggle={handleToggleModality}
      />

      <InputCard title="Word Counts per Modality">
        <WordCountInput
          label="Medium word count"
          value={formData.mediumWordCount}
          onChange={(val) => handleChange("mediumWordCount", val)}
        />
        <WordCountInput
          label="LinkedIn word count"
          value={formData.linkedinWordCount}
          onChange={(val) => handleChange("linkedinWordCount", val)}
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
          className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center"
        >
          <Lightbulb className="w-5 h-5 mr-3" />
          Generate Blog Assets
        </button>
      </div>
    </form>
  );
};

export default NewsRoomWorkflowPage;
