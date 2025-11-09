"use client";
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styling/dashboard.css"; // We will create this file next

// Define your initial set of available tags
const ALL_TAGS = [
  "LinkedIn",
  "Instagram",
  "Facebook",
  "Twitter",
  "Blog Post",
  "Email Newsletter",
  "SEO Keywords",
];

export default function DashboardPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Calculate which tags are *not* selected
  const unselectedTags = ALL_TAGS.filter((tag) => !selectedTags.includes(tag));

  // --- Tag Handlers ---

  /**
   * Adds a tag to the selected list.
   * We add it to the front of the array to make it appear first.
   */
  const handleSelectTag = (tag: string) => {
    // Add new tag to the beginning of the selected list
    setSelectedTags((prevTags) => [tag, ...prevTags.filter((t) => t !== tag)]);
  };

  /**
   * Removes a tag from the selected list.
   */
  const handleDeselectTag = (tagToDoRemove: string) => {
    setSelectedTags((prevTags) =>
      prevTags.filter((tag) => tag !== tagToDoRemove)
    );
  };

  /**
   * Main submission handler
   */
  const handleSubmitPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    // Your logic to send the prompt and selectedTags to the AI backend
    console.log("Submitting to AI:");
    console.log("Prompt:", prompt);
    console.log("Targets:", selectedTags);
    // Example:
    // await fetch(`${BACKEND_URL}/api/generate`, { ... });
  };

  return (
    <div>
      {/* === Top Menu Bar === */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            AI Agent System
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link active" aria-current="page" href="#">
                  Generator
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  History
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  Settings
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#">
                  Profile
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* === Main Content Area === */}
      <div className="container mt-4">
        <div
          className="card p-4 shadow-sm mx-auto"
          style={{ maxWidth: "800px" }}
        >
          <h3 className="text-center mb-3">Generate Blog Package</h3>

          <form onSubmit={handleSubmitPrompt}>
            {/* === Prompt Textbox === */}
            <div className="mb-3">
              <textarea
                className="form-control"
                rows={5}
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              ></textarea>
            </div>

            {/* === Tag Selection Area === */}
            <div className="mb-3">
              <label className="form-label fw-bold">Select Targets:</label>

              <div className="tag-container">
                {/* 1. Render Selected Tags (at the top) */}
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="btn btn-primary btn-sm me-2 mb-2 tag-btn"
                  >
                    <span
                      className="deselect-cross"
                      onClick={() => handleDeselectTag(tag)}
                    >
                      &times;
                    </span>
                    {tag}
                  </button>
                ))}

                {/* 2. Render Unselected Tags */}
                {unselectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="btn btn-outline-secondary btn-sm me-2 mb-2"
                    onClick={() => handleSelectTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* === Submit Button === */}
            <button type="submit" className="btn btn-success w-100">
              Generate
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
