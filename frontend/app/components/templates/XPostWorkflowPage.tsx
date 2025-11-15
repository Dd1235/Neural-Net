"use client";
import React, { useState } from "react";
import {
  Sparkles,
  PenSquare,
  Clipboard,
  Check,
  UserPlus,
  Loader2,
  MessageSquare,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";

type IterationResult = {
  iteration: number;
  generator_output: string;
  evaluator_score: number;
  evaluator_verdict: string;
  evaluator_notes: string;
  evaluator_action_items?: string[];
  human_feedback: { author: string; message: string; iteration?: number | null }[];
  optimized_post: string;
};

type FeedbackThread = {
  source: string;
  iteration: number;
  message: string;
  score?: number;
};

type IdeaResult = {
  id: string;
  headline: string;
  topic: string;
  summary: string;
  suggested_objective?: string;
  suggested_audience?: string;
  tone?: string;
  call_to_action?: string;
  keywords?: string[];
  hashtags?: string[];
  sample_tweet: string;
};

const InputCard: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
  <div className="bg-gray-800 rounded-xl shadow-lg p-6 space-y-4 border border-gray-700/50">
    <div className="flex items-center gap-3">
      {icon && <div className="text-blue-300">{icon}</div>}
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-400">{description}</p>
        )}
      </div>
    </div>
    {children}
  </div>
);

const Label: React.FC<{ title: string; hint?: string }> = ({
  title,
  hint,
}) => (
  <label className="block text-sm font-semibold text-gray-300 mb-2">
    {title}
    {hint && <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span>}
  </label>
);

const TextInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, isTextArea = false, rows = 4, disabled = false }) =>
  isTextArea ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`w-full p-3 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
        disabled ? "bg-gray-800/60 text-gray-500 cursor-not-allowed" : "bg-gray-900"
      }`}
    />
  ) : (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full p-3 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
        disabled ? "bg-gray-800/60 text-gray-500 cursor-not-allowed" : "bg-gray-900"
      }`}
    />
  );

const NumberInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}> = ({ value, onChange, min = 1, max = 5 }) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    onChange={(e) => onChange(Number(e.target.value))}
    className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
  />
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Unable to copy", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-400" />
          Copied
        </>
      ) : (
        <>
          <Clipboard className="w-4 h-4" />
          Copy
        </>
      )}
    </button>
  );
};

const defaultForm = {
  topic: "Hot take on today's breakout AI trend",
  objective: "Spark comments + reposts while nudging followers to our latest drop",
  audience: "AI builders, indie creators, Tech Twitter trend seekers",
  tone: "Bold, witty, internet-native",
  brandVoice: "Creator-first, data-backed hype with a playful wink",
  callToAction: "Tap the link for the full breakdown",
  productDetails:
    "Daily signal on what's moving in AI + stats from our community dashboard. 200k+ creators on the list.",
  keywords: "AI, #TechTwitter, #CreatorEconomy, viral",
  wordLimit: 280,
  maxIterations: 2,
};

interface XPostWorkflowPageProps {
  currentUser: {
    hasXCredentials?: boolean;
    bearerToken?: string; // <-- ADD THIS
  } | null;
}

const XPostWorkflowPage: React.FC<XPostWorkflowPageProps> = ({ currentUser }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [humanMessages, setHumanMessages] = useState<
    { id: number; author: string; message: string; iteration?: string }[]
  >([
    {
      id: 1,
      author: "creator-lead",
      message:
        "Make it feel like a must-share insight, keep emojis to one max, and end with an open question for replies.",
      iteration: "",
    },
  ]);
  const [iterations, setIterations] = useState<IterationResult[]>([]);
  const [feedbackThreads, setFeedbackThreads] = useState<FeedbackThread[]>([]);
  const [finalPost, setFinalPost] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideaMode, setIdeaMode] = useState<"trending" | "custom">("trending");
  const [ideaKeywords, setIdeaKeywords] = useState("AI, creator economy, viral launch");
  const [ideaResults, setIdeaResults] = useState<IdeaResult[]>([]);
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [postingToX, setPostingToX] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL;
  const canAutoPost = Boolean(currentUser?.hasXCredentials);

  const handleFormChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleHumanMessageChange = (
    id: number,
    field: "author" | "message" | "iteration",
    value: string
  ) => {
    setHumanMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, [field]: value } : msg))
    );
  };

  const addHumanMessage = () => {
    setHumanMessages((prev) => [
      ...prev,
      { id: prev.length + 1, author: "strategist", message: "", iteration: "" },
    ]);
  };

  const removeHumanMessage = (id: number) => {
    if (humanMessages.length === 1) return;
    setHumanMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const keywordListFromString = (value: string) =>
    value
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);

  const handleGenerateIdeas = async () => {
    if (!backendUrl) {
      setIdeaError("NEXT_PUBLIC_PYTHON_BACKEND_URL is not configured.");
      return;
    }

    const parsedKeywords =
      ideaMode === "custom" ? keywordListFromString(ideaKeywords) : [];

    if (ideaMode === "custom" && parsedKeywords.length === 0) {
      setIdeaError("Add at least one keyword to guide the brainstorm.");
      return;
    }

    setIdeaLoading(true);
    setIdeaResults([]);
    setIdeaError(null);
    try {
      const response = await fetch(`${backendUrl}/x-post/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: parsedKeywords,
          count: 4,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to generate trend ideas.");
      }

      const data = await response.json();
      setIdeaResults(data.ideas || []);
    } catch (err: any) {
      setIdeaError(err.message || "Unable to fetch trend ideas.");
      setIdeaResults([]);
    } finally {
      setIdeaLoading(false);
    }
  };

  const applyIdeaToBrief = (idea: IdeaResult) => {
    setFormData((prev) => ({
      ...prev,
      topic: idea.topic || idea.headline || prev.topic,
      objective: idea.suggested_objective || prev.objective,
      audience: idea.suggested_audience || prev.audience,
      tone: idea.tone || prev.tone,
      callToAction: idea.call_to_action || prev.callToAction,
      productDetails: idea.summary || prev.productDetails,
      keywords: idea.keywords?.join(", ") || prev.keywords,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backendUrl) {
      setError("NEXT_PUBLIC_PYTHON_BACKEND_URL is not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    setIterations([]);
    setFinalPost(null);
    setPostStatus(null);
    setPostError(null);

    const keywords = keywordListFromString(formData.keywords);

    const human_feedback = humanMessages
      .filter((msg) => msg.message.trim().length)
      .map((msg) => ({
        author: msg.author || "strategist",
        message: msg.message.trim(),
        iteration: msg.iteration ? Number(msg.iteration) : null,
      }));

    try {
      const response = await fetch(`${backendUrl}/x-post/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          objective: formData.objective,
          audience: formData.audience,
          tone: formData.tone,
          brand_voice: formData.brandVoice,
          call_to_action: formData.callToAction || null,
          product_details: formData.productDetails || null,
          keywords,
          word_limit: formData.wordLimit,
          max_iterations: formData.maxIterations,
          human_feedback,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to generate X post.");
      }

      const data = await response.json();
      setIterations(data.iterations || []);
      setFeedbackThreads(data.feedback_threads || []);
      setFinalPost(data.final_post || null);
      setAuditTrail(data.audit_trail || null);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostToX = async () => {
    if (!finalPost) return;
    setPostingToX(true);
    setPostStatus(null);
    setPostError(null);
    try {
      const res = await fetch("/api/x/post", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.bearerToken}`},
        body: JSON.stringify({ text: finalPost }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to post to X.");
      }
      setPostStatus("Tweet posted! Check your X account for the live post.");
    } catch (err: any) {
      setPostError(err.message || "Unable to post to X.");
    } finally {
      setPostingToX(false);
    }
  };

  const renderIteration = (iteration: IterationResult) => (
    <div
      key={iteration.iteration}
      className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-wide">
            Iteration {iteration.iteration}
          </p>
          <p className="text-lg font-semibold text-white">
            {iteration.evaluator_verdict} · Score {iteration.evaluator_score}/5
          </p>
        </div>
        <span className="rounded-full bg-blue-600/20 px-4 py-1 text-sm text-blue-200">
          Generator + Evaluator + Optimizer
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 mb-1">Generator Output</p>
        <p className="whitespace-pre-wrap text-gray-100 bg-gray-800 rounded-lg p-3 border border-gray-700">
          {iteration.generator_output}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-gray-800/80 p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-300" />
            Evaluator Observations
          </div>
          <p className="text-gray-200 whitespace-pre-wrap">
            {iteration.evaluator_notes}
          </p>
          {iteration.evaluator_action_items?.length ? (
            <ul className="list-disc ml-5 mt-3 space-y-1 text-sm text-gray-300">
              {iteration.evaluator_action_items.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-lg bg-gray-800/80 p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
            <UserPlus className="w-4 h-4 text-green-300" />
            Human Feedback Sent to Optimizer
          </div>
          {iteration.human_feedback?.length ? (
            <ul className="space-y-2 text-sm text-gray-200">
              {iteration.human_feedback.map((fb, idx) => (
                <li
                  key={`${fb.author}-${idx}`}
                  className="rounded-lg bg-gray-900/70 p-3 border border-gray-700/70"
                >
                  <p className="font-semibold text-white">{fb.author}</p>
                  <p className="text-gray-300">{fb.message}</p>
                  {fb.iteration && (
                    <p className="text-xs text-gray-500 mt-1">
                      Targeted Iteration: {fb.iteration}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">
              No human guidance was attached to this round.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 mb-1">Optimizer Output</p>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-gray-100 whitespace-pre-wrap">
          {iteration.optimized_post}
        </div>
      </div>
    </div>
  );

  return (
    <section className="p-6 md:p-10 text-white max-w-6xl mx-auto space-y-8">
      <InputCard
        title="Trending Idea Generator"
        description="Spin up the day's hottest conversation starters, then push one straight into the campaign brief."
        icon={<Sparkles className="w-5 h-5" />}
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIdeaMode("trending")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              ideaMode === "trending"
                ? "bg-blue-600 text-white"
                : "bg-gray-900 text-gray-300 border border-gray-700"
            }`}
          >
            General trending hooks
          </button>
          <button
            type="button"
            onClick={() => setIdeaMode("custom")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              ideaMode === "custom"
                ? "bg-blue-600 text-white"
                : "bg-gray-900 text-gray-300 border border-gray-700"
            }`}
          >
            Use my keywords
          </button>
        </div>

        <div className="space-y-2">
          <Label
            title="Keywords / niches"
            hint={ideaMode === "trending" ? "Optional" : "Required"}
          />
          <TextInput
            value={ideaKeywords}
            onChange={setIdeaKeywords}
            placeholder="ex: consumer AI, travel hacks, new Apple drop"
            isTextArea
            rows={2}
            disabled={ideaMode === "trending"}
          />
          <p className="text-xs text-gray-500">
            Outputs stay copy-friendly (think codes like RjPaMmH13OqLiMa0gWn3wnrtaxHT7x6olBSjikkSTpd09zYo9o) so you
            can drop them anywhere.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <button
            type="button"
            onClick={handleGenerateIdeas}
            disabled={ideaLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold shadow hover:bg-purple-500 transition disabled:opacity-60"
          >
            {ideaLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finding trends...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate idea cards
              </>
            )}
          </button>
          {ideaError && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-1">
              {ideaError}
            </p>
          )}
        </div>

        {ideaResults.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Pick an idea to auto-fill the brief or copy/paste the sample tweet.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {ideaResults.map((idea) => (
                <div
                  key={idea.id}
                  className="rounded-2xl border border-gray-700 bg-gray-900/60 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase text-gray-400">
                        {idea.topic || "Trend"}
                      </p>
                      <h3 className="text-lg font-semibold text-white">
                        {idea.headline}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyIdeaToBrief(idea)}
                      className="text-xs font-semibold rounded-full border border-blue-500 px-3 py-1 text-blue-200 hover:bg-blue-500/10 transition"
                    >
                      Use idea
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {idea.summary}
                  </p>
                  <div className="text-xs text-gray-400 space-y-1">
                    {idea.suggested_objective && (
                      <p>
                        Objective: <span className="text-gray-200">{idea.suggested_objective}</span>
                      </p>
                    )}
                    {idea.suggested_audience && (
                      <p>
                        Audience: <span className="text-gray-200">{idea.suggested_audience}</span>
                      </p>
                    )}
                    {idea.call_to_action && (
                      <p>
                        CTA: <span className="text-gray-200">{idea.call_to_action}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    {(idea.hashtags || []).map((tag) => (
                      <span
                        key={`${idea.id}-${tag}`}
                        className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-xl bg-gray-800/80 p-3 border border-gray-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                      <span>Sample tweet</span>
                      <CopyButton text={idea.sample_tweet} />
                    </div>
                    <p className="text-gray-100 text-sm whitespace-pre-wrap">
                      {idea.sample_tweet}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </InputCard>

      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/50 px-4 py-1 text-sm text-blue-200 bg-blue-500/10">
          <Sparkles className="w-4 h-4" />
          Multi-Agent X Post Studio
        </div>
        <h1 className="text-3xl font-extrabold">Ship smarter X posts</h1>
        <p className="text-gray-300 max-w-3xl">
          Orchestrate a generator, evaluator, optimizer loop powered by Groq open models.
          Attach human guidance at every iteration and review the full reasoning trail,
          making it easy to plug in future human evaluators.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputCard
          title="Campaign Brief"
          description="Everything the generator needs to craft the first draft."
          icon={<PenSquare className="w-5 h-5" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label title="Topic / Hook" />
              <TextInput
                value={formData.topic}
                onChange={(value) => handleFormChange("topic", value)}
                placeholder="e.g. Launching latency-free inference"
              />
            </div>
            <div>
              <Label title="Objective" hint="What should this post accomplish?" />
              <TextInput
                value={formData.objective}
                onChange={(value) => handleFormChange("objective", value)}
                placeholder="Drive waitlist signups, hype announcement..."
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label title="Audience" />
              <TextInput
                value={formData.audience}
                onChange={(value) => handleFormChange("audience", value)}
                placeholder="Developers, founders, AI researchers..."
              />
            </div>
            <div>
              <Label title="Tone" />
              <TextInput
                value={formData.tone}
                onChange={(value) => handleFormChange("tone", value)}
                placeholder="Bold, witty, confident..."
              />
            </div>
          </div>
          <div>
            <Label title="Brand Voice" />
            <TextInput
              value={formData.brandVoice}
              onChange={(value) => handleFormChange("brandVoice", value)}
              placeholder="Product-obsessed optimists, pragmatic, etc."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label title="Call to Action" />
              <TextInput
                value={formData.callToAction}
                onChange={(value) => handleFormChange("callToAction", value)}
                placeholder="Join waitlist, read launch blog..."
              />
            </div>
            <div>
              <Label title="Must-have keywords / hashtags" hint="Comma separated" />
              <TextInput
                value={formData.keywords}
                onChange={(value) => handleFormChange("keywords", value)}
                placeholder="AI infra, #LLM, low latency"
              />
            </div>
          </div>
          <div>
            <Label title="Product details / proof points" />
            <TextInput
              value={formData.productDetails}
              onChange={(value) => handleFormChange("productDetails", value)}
              placeholder="Sub-1s cold start, SOC2 compliant..."
              isTextArea
              rows={4}
            />
          </div>
        </InputCard>

        <InputCard
          title="Loop Controls"
          description="Tune the iteration count and how long the posts should be."
          icon={<ListChecks className="w-5 h-5" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label title="Character budget" hint="120 - 400" />
              <NumberInput
                value={formData.wordLimit}
                onChange={(value) => handleFormChange("wordLimit", value)}
                min={120}
                max={400}
              />
            </div>
            <div>
              <Label title="Max iterations" hint="Generator → Evaluator → Optimizer loops" />
              <NumberInput
                value={formData.maxIterations}
                onChange={(value) => handleFormChange("maxIterations", value)}
                min={1}
                max={5}
              />
            </div>
          </div>
        </InputCard>

        <InputCard
          title="Human Feedback Inbox"
          description="Seed operational guidance that the optimizer must respect. Perfect for future human-in-the-loop reviewers."
          icon={<UserPlus className="w-5 h-5" />}
        >
          <div className="space-y-4">
            {humanMessages.map((msg, idx) => (
              <div
                key={msg.id}
                className="rounded-xl border border-gray-700/70 p-4 bg-gray-900/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-300">
                    Feedback #{idx + 1}
                  </p>
                  {humanMessages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHumanMessage(msg.id)}
                      className="text-gray-400 hover:text-red-400 transition"
                      aria-label="Remove feedback"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label title="Author / Role" />
                    <TextInput
                      value={msg.author}
                      onChange={(value) =>
                        handleHumanMessageChange(msg.id, "author", value)
                      }
                      placeholder="Brand lead, PMM, strategist..."
                    />
                  </div>
                  <div>
                    <Label title="Target iteration" hint="Optional" />
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={msg.iteration || ""}
                      onChange={(e) =>
                        handleHumanMessageChange(msg.id, "iteration", e.target.value)
                      }
                      className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to apply to every round.
                    </p>
                  </div>
                </div>
                <div>
                  <Label title="Feedback to enforce" />
                  <TextInput
                    value={msg.message}
                    onChange={(value) =>
                      handleHumanMessageChange(msg.id, "message", value)
                    }
                    placeholder="Mention daily active users, reduce emoji usage..."
                    isTextArea
                    rows={3}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addHumanMessage}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 transition"
            >
              <Plus className="w-4 h-4" />
              Add feedback slot
            </button>
          </div>
        </InputCard>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <button
            type="submit"
            disabled={
              loading ||
              !formData.topic.trim() ||
              !formData.objective.trim() ||
              !formData.audience.trim()
            }
            className="inline-flex items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-500 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running workflow...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Run X Post Workflow
              </>
            )}
          </button>
          {error && (
            <p className="text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-2 text-sm">
              {error}
            </p>
          )}
        </div>
      </form>

      {finalPost && (
        <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">Final Recommendation</h2>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={finalPost} />
              <button
                type="button"
                disabled={!canAutoPost || postingToX}
                onClick={handlePostToX}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400 px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10 transition disabled:opacity-40"
              >
                {postingToX ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Post to X
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-gray-100 whitespace-pre-wrap">{finalPost}</p>
          {!canAutoPost && (
            <p className="text-sm text-yellow-200 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
              Connect your X API key + secret in the dashboard card above to enable one-click
              publishing.
            </p>
          )}
          {postStatus && (
            <p className="text-sm text-green-200 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
              {postStatus}
            </p>
          )}
          {postError && (
            <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
              {postError}
            </p>
          )}
          {auditTrail && (
            <div className="grid gap-3 md:grid-cols-3 text-sm text-gray-300">
              <p>
                <span className="text-gray-400">Iterations used:</span>{" "}
                {auditTrail.total_iterations}
              </p>
              <p>
                <span className="text-gray-400">Word limit:</span>{" "}
                {auditTrail.word_limit}
              </p>
              <p>
                <span className="text-gray-400">Generator model:</span>{" "}
                {auditTrail.models?.generator}
              </p>
            </div>
          )}
        </div>
      )}

      {iterations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Iteration journal</h2>
          <div className="space-y-6">
            {iterations.map((iteration) => renderIteration(iteration))}
          </div>
        </div>
      )}

      {feedbackThreads.length > 0 && (
        <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="w-5 h-5 text-purple-300" />
            Feedback Thread
          </div>
          <p className="text-sm text-gray-400">
            Every automated and human message that landed in the optimizer. Extend this
            feed later with a true human evaluator hand-off.
          </p>
          <div className="space-y-3">
            {feedbackThreads.map((entry, idx) => (
              <div
                key={`${entry.source}-${idx}`}
                className="rounded-xl border border-gray-700/70 bg-gray-800/70 p-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">
                    {entry.source.replace("human:", "Human · ")}
                  </span>
                  <span className="text-gray-400">Iteration {entry.iteration}</span>
                </div>
                <p className="text-gray-200 mt-2 whitespace-pre-wrap">{entry.message}</p>
                {typeof entry.score === "number" && (
                  <p className="text-xs text-gray-500 mt-2">
                    Evaluator score: {entry.score}/5
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default XPostWorkflowPage;
