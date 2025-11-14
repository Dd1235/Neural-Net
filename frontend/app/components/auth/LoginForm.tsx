"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  setMessage: (message: string) => void;
}

export default function LoginForm({ setMessage }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  //  since auth now lives inside /app/api/auth/route.ts, no need for external backend URL
  const loginHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login", // ✅ required in the new unified route
          email,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        router.push("/dashboard");
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`⚠️ Network error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={loginHandle} className="auth-form">
      <h3 className="form-title">Sign In</h3>
      <p className="form-subtitle">
        Welcome back! Enter your credentials to access your workspace.
      </p>

      <label htmlFor="login-email" className="input-label">
        Email address
      </label>
      <div className="input-wrapper">
        <input
          id="login-email"
          type="email"
          className="auth-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <label htmlFor="login-password" className="input-label">
        Password
      </label>
      <div className="input-wrapper">
        <input
          id="login-password"
          type="password"
          className="auth-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="auth-button">
        Continue
      </button>
    </form>
  );
}
