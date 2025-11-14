"use client";
import React, { useState } from "react";

interface SignUpFormProps {
  setMessage: (message: string) => void;
}

export default function SignUpForm({ setMessage }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ call unified Next.js API route
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup", // ✅ tells API what operation to do
          username: name,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
        setName("");
        setEmail("");
        setPassword("");
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`⚠️ Network error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="auth-form">
      <h3 className="form-title">Create account</h3>
      <p className="form-subtitle">
        Launch your first project in minutes. All you need is an email.
      </p>

      <label htmlFor="signup-name" className="input-label">
        Full Name
      </label>
      <div className="input-wrapper">
        <input
          id="signup-name"
          type="text"
          className="auth-input"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
      </div>

      <label htmlFor="signup-email" className="input-label">
        Email address
      </label>
      <div className="input-wrapper">
        <input
          id="signup-email"
          type="email"
          className="auth-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <label htmlFor="signup-password" className="input-label">
        Password
      </label>
      <div className="input-wrapper">
        <input
          id="signup-password"
          type="password"
          className="auth-input"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      <button type="submit" className="auth-button">
        Create account
      </button>
    </form>
  );
}
