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
    <form onSubmit={handleSignUp}>
      <h3 className="text-center mb-3">Sign Up</h3>

      <div className="mb-3">
        <label className="text-start d-block">Full Name</label>
        <input
          type="text"
          className="form-control"
          placeholder="Enter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="mb-3">
        <label className="text-start d-block">Email address</label>
        <input
          type="email"
          className="form-control"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="mb-3">
        <label className="text-start d-block">Password</label>
        <input
          type="password"
          className="form-control"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="btn btn-primary w-100">
        Sign Up
      </button>
    </form>
  );
}
