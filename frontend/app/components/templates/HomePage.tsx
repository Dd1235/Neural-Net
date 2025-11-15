"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Activity, ShieldCheck, RefreshCw } from "lucide-react";

interface StatusState {
  ping: string;
  health: string;
  loading: boolean;
  error: string | null;
  lastChecked: Date | null;
}

const features = [
  {
    title: "Blog Workflow",
    description:
      "Multi-modal blog creation with Groq agents, automated revisions, and SDXL-ready imagery.",
  },
  {
    title: "Newsroom + Content Agents",
    description:
      "Rapid topic exploration and newsroom-style generation pipelines tailored to your audience.",
  },
  {
    title: "YouTube → Blog Composer",
    description:
      "Convert any public video into a full article, summary, and raw transcript for faster repurposing.",
  },
  {
    title: "Image Library",
    description:
      "SDXL image generations are stored per user with download + cleanup controls.",
  },
  {
    title: "Content Repurposer",
    description:
      "Feed articles into LangGraph workflows and receive summaries, social posts, FAQs, and entities.",
  },
];

const HomePage: React.FC = () => {
  const [status, setStatus] = useState<StatusState>({
    ping: "—",
    health: "—",
    loading: false,
    error: null,
    lastChecked: null,
  });

  const checkBackend = useCallback(async () => {
    const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL;
    if (!baseUrl) {
      setStatus((prev) => ({
        ...prev,
        error: "NEXT_PUBLIC_PYTHON_BACKEND_URL is not configured.",
        ping: "unknown",
        health: "unknown",
      }));
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [pingResponse, healthResponse] = await Promise.all([
        fetch(`${baseUrl}/ping`),
        fetch(`${baseUrl}/health`),
      ]);

      if (!pingResponse.ok || !healthResponse.ok) {
        throw new Error("Backend returned a non-200 status.");
      }

      const pingJson = await pingResponse.json();
      const healthJson = await healthResponse.json();

      setStatus({
        ping: pingJson?.message || "pong",
        health: healthJson?.status || "ok",
        loading: false,
        error: null,
        lastChecked: new Date(),
      });
    } catch (err: any) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Unable to reach backend health endpoints.",
      }));
    }
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  return (
    <div className="p-6 md:p-10 text-white max-w-5xl mx-auto space-y-8">
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-widest text-red-400 font-semibold">
          Neural-Net Platform
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">
          Welcome to your multi-agent creative workspace.
        </h1>
        <p className="text-gray-400 text-lg">
          This dashboard bundles every workflow we&apos;ve delivered so far: blog drafting, newsroom
          coverage, repurposing pipelines, YouTube summarization, and an SDXL image toolchain—all
          powered by the FastAPI backend.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold">Backend Health</h2>
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            <p>
              <span className="text-gray-400">Ping:</span> {status.ping}
            </p>
            <p>
              <span className="text-gray-400">Health:</span> {status.health}
            </p>
            {status.lastChecked && (
              <p className="text-xs text-gray-500">
                Updated {status.lastChecked.toLocaleTimeString()}
              </p>
            )}
            {status.error && (
              <p className="text-xs text-red-400">⚠ {status.error}</p>
            )}
          </div>
          <button
            type="button"
            onClick={checkBackend}
            disabled={status.loading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${status.loading ? "animate-spin" : ""}`} />
            {status.loading ? "Checking..." : "Refresh status"}
          </button>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Getting started</h2>
          </div>
          <ol className="list-decimal list-inside text-gray-300 space-y-1 text-sm">
            <li>Pick a workflow from the sidebar (Blog, Newsroom, Repurposer, etc.).</li>
            <li>Fill in the prompts / brand voice and hit Generate.</li>
            <li>
              Download text or images, then revisit the Image Library to manage historical assets.
            </li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">What&apos;s included</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-2"
            >
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
