"use client";
import React, { useState } from "react";
import { Sparkles, Youtube, Clipboard, Check } from "lucide-react";
import InputCard from "../generate/InputCard";
import TextInput from "../generate/TextInput";

interface VideoBlogResult {
  metadata: {
    title?: string;
    description?: string;
    channel?: string;
    duration?: number;
  };
  blog_post: string;
  summary: string;
  video_url: string;
  word_count: number;
  transcript?: string;
}

const ClipboardCopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard error", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center px-3 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2 text-green-400" /> Copied
        </>
      ) : (
        <>
          <Clipboard className="w-4 h-4 mr-2" /> Copy
        </>
      )}
    </button>
  );
};

const ResultSection: React.FC<{ result: VideoBlogResult }> = ({ result }) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-white mb-2">
          {result.metadata.title || "Untitled video"}
        </h3>
        <p className="text-gray-400 text-sm">
          {result.metadata.channel || "Unknown creator"} •{" "}
          {formatDuration(result.metadata.duration)}
        </p>
        <a
          href={result.video_url}
          target="_blank"
          rel="noreferrer"
          className="text-red-400 text-sm hover:text-red-300 mt-3 inline-block"
        >
          View on YouTube
        </a>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-100">Summary</h4>
          <ClipboardCopyButton text={result.summary} />
        </div>
        <pre className="bg-gray-900 rounded-lg p-4 text-gray-200 whitespace-pre-wrap font-sans">
          {result.summary}
        </pre>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-100">
            Blog Draft (~{result.word_count} words)
          </h4>
          <ClipboardCopyButton text={result.blog_post} />
        </div>
        <pre className="bg-gray-900 rounded-lg p-4 text-gray-200 whitespace-pre-wrap font-sans">
          {result.blog_post}
        </pre>
      </div>

      {result.transcript && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-100">Full Transcript</h4>
            <ClipboardCopyButton text={result.transcript} />
          </div>
          <pre className="bg-gray-900 rounded-lg p-4 text-gray-300 whitespace-pre-wrap font-mono max-h-[420px] overflow-y-auto">
            {result.transcript}
          </pre>
        </div>
      )}
    </div>
  );
};

const YouTubeBlogPage: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [wordCount, setWordCount] = useState("600");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoBlogResult | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!youtubeUrl.trim()) {
      setError("Please provide a valid YouTube URL.");
      return;
    }
    if (!prompt.trim()) {
      setError("Please describe the article angle or objective.");
      return;
    }

    const parsedWordCount = parseInt(wordCount.trim(), 10);
    if (Number.isNaN(parsedWordCount) || parsedWordCount < 200 || parsedWordCount > 2000) {
      setError("Word count must be a number between 200 and 2000.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/youtube-blog`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtube_url: youtubeUrl.trim(),
            prompt: prompt.trim(),
            word_count: parsedWordCount,
          }),
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = payload?.detail || "Unable to generate blog for this video.";
        throw new Error(detail);
      }

      setResult({
        metadata: payload.metadata ?? {},
        blog_post: payload.blog_post ?? "",
        summary: payload.summary ?? "",
        video_url: payload.video_url ?? youtubeUrl,
        word_count: payload.word_count ?? parsedWordCount,
        transcript: payload.transcript ?? "",
      });
    } catch (err: any) {
      console.error("YouTube blog error:", err);
      setError(`⚠️ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 text-white max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Youtube className="w-8 h-8 text-red-500 mr-3" />
          Dashboard / YouTube Blog
        </h1>
        <p className="text-gray-400">
          Convert any public YouTube video into a structured article directly inside the dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputCard
          title="Video Inputs"
          description="Provide the source URL and describe what you would like the article to focus on."
        >
          <TextInput
            label="YouTube URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <TextInput
            label="Brief / Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            isTextArea
            placeholder="Describe the POV or themes to highlight..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Word Count
            </label>
            <input
              type="number"
              min={200}
              max={2000}
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
              className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg p-3 focus:ring-red-500 focus:border-red-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Recommended range: 200 - 2000 words for consistent Groq output.
            </p>
          </div>
        </InputCard>

        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5 mr-3" />
          {loading ? "Generating blog..." : "Generate Blog"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-900 border border-red-700 text-red-100 rounded-lg">
          {error}
        </div>
      )}

      {result && <ResultSection result={result} />}
    </div>
  );
};

export default YouTubeBlogPage;
