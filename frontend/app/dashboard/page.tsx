"use client";
import React, { useState } from "react";
import PromptForm from "@/app/components/generate/PromptForm";

export default function Dashboard() {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    console.log("Prompt submitted:", prompt);
    // You can later send this to your backend via fetch()
  };

  return (
    <div className="p-4">
      <h3 className="mb-3">Dashboard</h3>

      {/* Prompt input area */}
      <PromptForm prompt={prompt} setPrompt={setPrompt} />

      <button className="btn btn-primary mt-3" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
}
