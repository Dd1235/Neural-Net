"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../styles/homepage.css";
import "bootstrap/dist/css/bootstrap.min.css";
import LoginForm from "../components/auth/LoginForm";
import SignUpForm from "../components/auth/SignUpForm";

type Tab = "login" | "signup";
type ThemeMode = "system" | "light" | "dark";
type Theme = "light" | "dark";
type AuthState = "checking" | "guest" | "redirecting";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [message, setMessage] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [theme, setTheme] = useState<Theme>("light");
  const [authState, setAuthState] = useState<AuthState>("checking");
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSuccessMessage = useMemo(
    () => message.startsWith("✅"),
    [message]
  );

  const clearMessageAndSetTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setMessage("");
  }, []);

  // Resolve default tab from query string (?mode=signup)
  useEffect(() => {
    const modeQuery = searchParams?.get("mode");
    if (modeQuery === "signup" || modeQuery === "login") {
      clearMessageAndSetTab(modeQuery);
    }
  }, [searchParams, clearMessageAndSetTab]);

  // Redirect authenticated users straight to dashboard
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          setAuthState("redirecting");
          router.replace("/dashboard");
          return;
        }
      } catch (error) {
        // ignore and fall through to guest state
      }
      setAuthState("guest");
    };
    fetchSession();
  }, [router]);

  // Sync mode with saved preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("auth-theme-mode") as ThemeMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeMode(saved);
    }
  }, []);

  // Persist preference & resolve actual theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("auth-theme-mode", themeMode);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      if (themeMode === "system") {
        setTheme(mediaQuery.matches ? "dark" : "light");
      } else {
        setTheme(themeMode);
      }
    };

    applyTheme();

    const handleChange = (event: MediaQueryListEvent) => {
      if (themeMode === "system") {
        setTheme(event.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      if (prev === "system") {
        return theme === "light" ? "dark" : "light";
      }
      return prev === "light" ? "dark" : "light";
    });
  };

  const syncWithSystem = () => {
    setThemeMode("system");
  };

  const renderStatus = () => (
    <div className={`login-page ${theme}`}>
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="home-container auth-loading">
        <p className="eyebrow">Creative Automation AI</p>
        <h1>
          {authState === "redirecting"
            ? "Taking you to your dashboard..."
            : "Checking your workspace..."}
        </h1>
        <p className="subtitle">
          {authState === "redirecting"
            ? "You are already signed in. Hang tight while we redirect you."
            : "Sign-in screen will appear once we confirm you're not logged in."}
        </p>
      </div>
    </div>
  );

  if (authState !== "guest") {
    return renderStatus();
  }

  return (
    <div className={`login-page ${theme}`}>
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="home-container">
        <div className="page-header">
          <div>
            <p className="eyebrow">Creative Automation AI</p>
            <h1>Welcome back</h1>
            <p className="subtitle">
              Sign in or create an account to continue building magical content.
            </p>
          </div>
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              className="system-sync"
              onClick={syncWithSystem}
              disabled={themeMode === "system"}
            >
              Sync with system
            </button>
          </div>
        </div>

        <div className="tab-switcher" role="tablist" aria-label="Auth tabs">
          <button
            role="tab"
            aria-selected={activeTab === "login"}
            className={`tab-button ${activeTab === "login" ? "active" : ""}`}
            onClick={() => clearMessageAndSetTab("login")}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "signup"}
            className={`tab-button ${activeTab === "signup" ? "active" : ""}`}
            onClick={() => clearMessageAndSetTab("signup")}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-card">
          {message && (
            <div
              className={`status-banner ${
                isSuccessMessage ? "success" : "error"
              }`}
              role="status"
            >
              {message}
            </div>
          )}

          {activeTab === "login" ? (
            <LoginForm setMessage={setMessage} />
          ) : (
            <SignUpForm setMessage={setMessage} />
          )}
        </div>
      </div>
    </div>
  );
}
