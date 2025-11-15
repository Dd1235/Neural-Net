"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wand2,
} from "lucide-react";

interface GeneratedAudioRecord {
  id: number;
  text: string;
  description: string;
  voiceLabel: string | null;
  audioUrl: string;
  createdAt: string;
}

const VOICE_PRESETS = [
  {
    id: "orion",
    name: "Orion · Energetic Host",
    description:
      "An upbeat male narrator with a dynamic pacing and confident energy that keeps long explainers exciting.",
  },
  {
    id: "lyra",
    name: "Lyra · Calm Researcher",
    description:
      "A thoughtful female guide with a grounded, insightful tone that feels like an expert walking you through data.",
  },
  {
    id: "sol",
    name: "Sol · Crisp Analyst",
    description:
      "A clear, bright voice with newsroom polish—perfect for short summaries or briefing style updates.",
  },
  {
    id: "vega",
    name: "Vega · Documentary Voice",
    description:
      "A rich, cinematic storyteller with a deep register and deliberate pacing for serious narratives.",
  },
];

const MIXTRAL_PLACEHOLDER =
  "Mixtral of Experts blends expert routing with sparse activation so only a subset of 22B parameters fire at each token—delivering 8x capacity without 8x compute. The paper shows how MoE routing plus better KV caching lets long-context agents plan faster while keeping latency low.";

const TextToAudioPage: React.FC = () => {
  const [text, setText] = useState(MIXTRAL_PLACEHOLDER.slice(0, 400));
  const [selectedVoiceId, setSelectedVoiceId] = useState(VOICE_PRESETS[0].id);
  const [useCustomDescription, setUseCustomDescription] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [history, setHistory] = useState<GeneratedAudioRecord[]>([]);
  const [latestAudio, setLatestAudio] = useState<GeneratedAudioRecord | null>(
    null
  );
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  const activePreset = useMemo(
    () => VOICE_PRESETS.find((preset) => preset.id === selectedVoiceId),
    [selectedVoiceId]
  );

  const resolvedDescription = useCustomDescription
    ? customDescription.trim()
    : activePreset?.description ?? "";

  const canSubmit =
    text.trim().length > 0 &&
    text.trim().length <= 400 &&
    resolvedDescription.length > 0 &&
    !isGenerating;

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/text-to-audio", {
        credentials: "include",
      });
      if (res.status === 401) {
        setHistory([]);
        setHistoryError("Please sign in to see your audio history.");
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load audio history (${res.status})`);
      }
      const data = await res.json();
      setHistory(Array.isArray(data.audios) ? data.audios : []);
    } catch (err) {
      console.error("Audio history fetch failed:", err);
      const message =
        err instanceof Error ? err.message : "Unable to load audio history.";
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSelectPreset = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setUseCustomDescription(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(null);

    try {
      const payload = {
        text: text.trim(),
        description: resolvedDescription,
        voiceLabel: useCustomDescription
          ? "Custom voice"
          : activePreset?.name ?? "Preset",
      };

      const res = await fetch("/api/text-to-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      // console.log("data fetched is", data);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate audio");
      }

      const newAudio: GeneratedAudioRecord | null = data?.audio || null;
      if (newAudio) {
        setHistory((prev) => [newAudio, ...prev]);
        setLatestAudio(newAudio);
      } else {
        await fetchHistory();
        setLatestAudio(null);
      }

      setGenerateSuccess("Audio ready! Scroll down to preview and download.");
    } catch (err) {
      console.error("Audio generation failed:", err);
      const message =
        err instanceof Error ? err.message : "Unable to generate audio.";
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 md:p-10 text-white max-w-6xl mx-auto space-y-10">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-fuchsia-500/20 px-4 py-2 border border-indigo-500/40">
          <AudioLines className="w-6 h-6 text-indigo-300" />
          <span className="text-indigo-100 text-sm font-semibold uppercase tracking-wide">
            Dashboard / Text to Audio
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Turn short research bullets into cinematic voiceovers.
        </h1>
        <p className="text-gray-400 max-w-3xl">
          Draft a 400-character takeaway, pick a preset narrator or bring your
          own vibe, then store every generated clip with its prompt for quick
          reuse.
        </p>
      </header>

      <form
        className="bg-gray-900/80 border border-gray-800 rounded-2xl shadow-2xl shadow-black/30 divide-y divide-gray-800"
        onSubmit={handleGenerate}
      >
        <section className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-300" />
              Prompt
            </h2>
            <span className="text-sm text-gray-400">
              {text.trim().length}/400 characters
            </span>
          </div>
          <textarea
            value={text}
            maxLength={400}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 p-4 min-h-[120px] text-gray-100"
            placeholder="Mixtral of Experts is a sparse MoE that routes each token to top experts, cutting compute while boosting reasoning..."
          />
          <p className="text-sm text-gray-500">
            Helpful for highlight reels—keep it tight and high-signal. Need to
            reset? Use the Mixtral blurb above.
          </p>
        </section>

        <section className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AudioLines className="w-5 h-5 text-emerald-300" />
              Voice profile
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {VOICE_PRESETS.map((preset) => {
              const selected =
                !useCustomDescription && selectedVoiceId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selected
                      ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                      : "border-gray-700 hover:border-emerald-400/50 bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{preset.name}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {preset.description}
                      </p>
                    </div>
                    {selected && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-gray-300">
              <input
                type="checkbox"
                className="accent-purple-500 w-4 h-4"
                checked={useCustomDescription}
                onChange={(e) => setUseCustomDescription(e.target.checked)}
              />
              Craft my own voice description
            </label>
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              disabled={!useCustomDescription}
              maxLength={300}
              className={`w-full rounded-xl border p-3 min-h-[100px] bg-gray-800 text-gray-100 ${
                useCustomDescription
                  ? "border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  : "border-gray-700 opacity-70 cursor-not-allowed"
              }`}
              placeholder="e.g., A futuristic storyteller with a warm accent who glides between excitement and curiosity."
            />
            <p className="text-xs text-gray-500">
              Describe tone, pacing, gender, or inspiration. We will pass this
              directly to Parler TTS.
            </p>
          </div>
        </section>

        <section className="p-6 flex flex-col gap-3">
          {generateError && (
            <div className="flex items-center gap-3 rounded-xl bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-100">
              <AlertCircle className="w-4 h-4" />
              {generateError}
            </div>
          )}
          {generateSuccess && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-900/30 border border-emerald-600/60 px-4 py-3 text-sm text-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
              {generateSuccess}
            </div>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-lg font-semibold transition-colors ${
              canSubmit
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating clip...
              </>
            ) : (
              "Generate audio"
            )}
          </button>
          {latestAudio && (
            <div className="mt-6 rounded-2xl border border-indigo-500/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-wide text-indigo-200">
                    Latest clip
                  </p>
                  <p className="text-gray-100 font-semibold text-lg">
                    {latestAudio.voiceLabel || "Custom voice"}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">
                {latestAudio.text}
              </p>
              <div className="bg-black/30 rounded-xl p-3 border border-indigo-900/40 text-xs text-gray-300">
                <p className="font-semibold text-indigo-200 mb-1">
                  Voice prompt
                </p>
                {latestAudio.description}
              </div>
              <audio
                controls
                src={latestAudio.audioUrl}
                className="w-full rounded-lg"
              />
              <a
                href={latestAudio.audioUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-center rounded-xl border border-indigo-400 px-4 py-2 text-sm font-semibold text-indigo-100 hover:bg-indigo-500/20 transition-colors"
              >
                Download clip
              </a>
            </div>
          )}
        </section>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <History className="w-6 h-6 text-orange-300" />
            Audio history
          </h2>
          <button
            type="button"
            onClick={fetchHistory}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm border border-gray-700"
          >
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your clips...
          </div>
        ) : historyError ? (
          <div className="flex items-center gap-3 rounded-xl bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-100">
            <AlertCircle className="w-4 h-4" />
            {historyError}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-6 text-gray-400 text-sm">
            No audio clips yet. Generate your first snippet above and it will
            appear here.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 flex flex-col gap-4"
              >
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p className="font-semibold text-lg mt-1 text-gray-100">
                    {item.voiceLabel || "Custom voice"}
                  </p>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {item.text}
                </p>
                <div className="bg-gray-800/70 rounded-xl p-3 text-xs text-gray-400 border border-gray-700">
                  <p className="font-semibold text-gray-200 mb-1">
                    Voice prompt
                  </p>
                  {item.description}
                </div>
                <audio
                  controls
                  src={item.audioUrl}
                  className="w-full rounded-lg"
                />
                <a
                  href={item.audioUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="text-center text-sm font-semibold rounded-xl border border-indigo-400 text-indigo-200 px-4 py-2 hover:bg-indigo-500/20 transition-colors"
                >
                  Download clip
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TextToAudioPage;
