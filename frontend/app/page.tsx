"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AuthState = "checking" | "authenticated" | "guest";

const featureHighlights = [
  {
    title: "One-click workflows",
    description:
      "Launch campaigns, blogs, newsroom recaps, and YouTube repurposing from a single canvas.",
  },
  {
    title: "Context-aware AI",
    description:
      "Upcoming: Train on your brand voice, pull real-time references, and keep every asset on-message.",
  },
  {
    title: "Infinite scale",
    description:
      "Upcoming: Collaborate across teams with version history, approval flows, and shareable AI briefs.",
  },
];

const stats = [
  { label: "Teams onboarded (not really)", value: "230+" },
  { label: "Campaigns launched", value: "12k" },
  { label: "Avg. time saved", value: "18 hrs" },
];

export default function LandingPage() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          setAuthState("authenticated");
          return;
        }
      } catch (error) {
        // ignore errors; treat as guest
      }
      setAuthState("guest");
    };
    checkAuth();
  }, []);

  const primaryAction = useMemo(
    () => (authState === "authenticated" ? "/dashboard" : "/auth?mode=signup"),
    [authState]
  );

  const secondaryAction = useMemo(
    () => (authState === "authenticated" ? "/dashboard" : "/auth"),
    [authState]
  );

  const primaryLabel =
    authState === "authenticated" ? "Go to dashboard" : "Start for free";
  const secondaryLabel =
    authState === "authenticated" ? "Open dashboard" : "Log in";

  const handlePrimary = () => router.push(primaryAction);
  const handleSecondary = () => router.push(secondaryAction);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black" />
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-500/30 blur-[140px]" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-[140px]" />
      </div>

      <div className="relative z-10">
        <header className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between lg:px-16">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-white/10 text-center text-sm leading-8">
              CA
            </div>
            Creative Automation (Work in Progress!!)
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
            <Link href="#features" className="hover:text-white">
              Features
            </Link>
            <Link href="#automation" className="hover:text-white">
              Automation
            </Link>
            <Link href="#workflow" className="hover:text-white">
              Workflows
            </Link>
            <button
              onClick={handleSecondary}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40"
            >
              {secondaryLabel}
            </button>
          </nav>
        </header>

        <main className="px-6 pb-24 pt-10 lg:px-16 lg:pt-20">
          <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                Creative suite 2.1
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl">
                Launch brand-safe content in minutes, not weeks.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-slate-300">
                Your full-funnel AI studio for blogs, newsroom recaps, YouTube
                breakdowns, and image generation—all orchestrated from a single
                command center.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  onClick={handlePrimary}
                  className="rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  {primaryLabel}
                </button>
                <button
                  onClick={handleSecondary}
                  className="rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:border-white/60"
                >
                  {secondaryLabel}
                </button>
                {authState === "checking" && (
                  <span className="text-sm text-slate-400">
                    Checking your session…
                  </span>
                )}
              </div>
              <div className="mt-12 grid gap-6 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-semibold text-white">
                      {stat.value}
                    </p>
                    <p className="text-sm uppercase tracking-wide text-slate-400">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <div className="text-sm font-medium uppercase tracking-[0.3em] text-slate-300">
                Workflow preview
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    Blog engine
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    6-post product launch campaign
                  </p>
                  <p className="text-sm text-slate-400">
                    Persona-aware outlines, SEO briefs, organic snippets
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">
                    Repurpose
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    YouTube → newsroom digest
                  </p>
                  <p className="text-sm text-slate-400">
                    Transcript cleanup, social-ready pull-quotes, hero imagery
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
                    Automation
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Daily insight capsule
                  </p>
                  <p className="text-sm text-slate-400">
                    Auto-ingests feeds, drafts, and ships recaps to every
                    channel
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            id="features"
            className="mt-24 grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur md:grid-cols-3"
          >
            {featureHighlights.map((feature) => (
              <div key={feature.title}>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  {feature.title}
                </div>
                <p className="mt-4 text-base text-slate-200">
                  {feature.description}
                </p>
              </div>
            ))}
          </section>

          <section
            id="automation"
            className="mt-16 grid gap-8 rounded-3xl border border-white/5 bg-slate-900/60 p-8 backdrop-blur md:grid-cols-2"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Automation engine
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Deploy multi-channel journeys that run themselves.
              </h2>
              <p className="mt-4 text-slate-300">
                Drag-and-drop triggers, CRM sync, and human-in-the-loop QA keep
                your automations personal while eliminating the busywork.
              </p>
            </div>
            <div className="space-y-4">
              {[
                "Ingest briefs, feeds, RAG knowledge bases, and transcripts.",
                "Route outputs through brand, legal, and stakeholder approvals.",
                "Publish directly to CMS, newsletter, podcast, and socials.",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-slate-200"
                >
                  {step}
                </div>
              ))}
            </div>
          </section>

          <section
            id="workflow"
            className="mt-24 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/60 to-slate-800/60 p-8 backdrop-blur"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Workflow orchestration
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  Everything your content team needs in a single dashboard.
                </h2>
                <p className="mt-4 text-slate-300">
                  Blog ideation, newsroom generation, YouTube summarization,
                  image creation, and more—all guarded by enterprise-grade
                  governance.
                </p>
              </div>
              <button
                onClick={handlePrimary}
                className="rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                {primaryLabel}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
