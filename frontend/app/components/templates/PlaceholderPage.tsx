"use client";
import React from "react";
import { Settings } from "lucide-react";

interface PlaceholderPageProps {
  page: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ page }) => (
  <div className="flex items-center justify-center h-full p-10 text-center text-gray-400">
    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700/50">
      <Settings className="w-10 h-10 mx-auto mb-4 text-blue-400 animate-spin" />
      <h2 className="text-2xl font-semibold text-white">Welcome to the {page} page!</h2>
      <p className="mt-2">
        Content for this section goes here. This demonstrates client-side routing within our
        single-page application.
      </p>
    </div>
  </div>
);

export default PlaceholderPage;
