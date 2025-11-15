"use client";

import React, { useState } from "react";
import { LogOut, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";

interface DashboardUser {
  username: string;
  email: string;
  createdAt?: string;
  hasXCredentials?: boolean;
}

interface UserProfileCardProps {
  user: DashboardUser;
  onLogout: () => Promise<void>;
  onCredentialsChange: (hasKeys: boolean) => void;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user,
  onLogout,
  onCredentialsChange,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [bearerToken, setBearerToken] = useState("");   // <-- NEW FIELD
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/user/x-credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          bearerToken,     // <-- SEND IT TO BACKEND
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Failed to store credentials.");
      }

      setApiKey("");
      setApiSecret("");
      setBearerToken("");   // <-- RESET FIELD
      setMessage("X API keys & bearer token saved securely.");
      onCredentialsChange(true);
    } catch (err: any) {
      setError(err.message || "Failed to save credentials.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/user/x-credentials", {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Failed to remove credentials.");
      }

      onCredentialsChange(false);
      setMessage("Removed X API keys & bearer token.");
    } catch (err: any) {
      setError(err.message || "Failed to remove credentials.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Signed in as</p>
          <h2 className="text-2xl font-semibold text-white">{user.username}</h2>
          <p className="text-gray-300">{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/70 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="rounded-xl bg-gray-800/60 p-4 space-y-3 border border-gray-700/60">
        <div className="flex items-center gap-2 text-white font-semibold">
          <KeyRound className="w-4 h-4 text-blue-300" />
          Connect X Publishing Keys
        </div>

        <p className="text-sm text-gray-400">
          Store your <code>X_API_KEY</code>, <code>X_API_SECRET</code>, and{" "}
          <code>BEARER_TOKEN</code> encrypted so the workflow can publish directly to X.
        </p>

        <div className="text-sm text-gray-300 flex items-center gap-2">
          {user.hasXCredentials ? (
            <>
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Keys connected · ready to post
            </>
          ) : (
            <>
              <ShieldOff className="w-4 h-4 text-yellow-400" />
              Keys not connected
            </>
          )}
        </div>

        {/* Inputs for KEY, SECRET, BEARER */}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              X API Key (Client ID)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. RjPaMmH13OqLiMa0gWn3..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900/80 p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              X API Secret
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Keep this safe"
              className="w-full rounded-lg border border-gray-700 bg-gray-900/80 p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* NEW BEARER TOKEN FIELD */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              X Bearer Token
            </label>
            <input
              type="password"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Your Bearer Token"
              className="w-full rounded-lg border border-gray-700 bg-gray-900/80 p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving || !apiKey || !apiSecret || !bearerToken}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save keys securely"}
          </button>

          <button
            type="button"
            disabled={removing || !user.hasXCredentials}
            onClick={handleRemove}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 transition disabled:opacity-50"
          >
            {removing ? "Removing..." : "Remove keys"}
          </button>
        </div>

        {message && (
          <p className="text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            {message}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </section>
  );
};

export default UserProfileCard;
