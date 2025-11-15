"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Image as ImageIcon, Loader2, Download, Trash2, RefreshCw } from "lucide-react";

interface GeneratedImageRecord {
  id: number;
  prompt: string;
  fileKey: string;
  imageUrl: string;
  createdAt: string;
}

const GeneratedImagesPage: React.FC = () => {
  const [images, setImages] = useState<GeneratedImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generated-images", {
        credentials: "include",
      });
      if (res.status === 401) {
        setImages([]);
        setError("Please log in to view your generated images.");
        return;
      }
      if (!res.ok) {
        throw new Error(`Unable to load images (${res.status})`);
      }
      const data = await res.json();
      setImages(Array.isArray(data.images) ? data.images : []);
    } catch (err: any) {
      console.error("Image library fetch error:", err);
      setError(err?.message || "Failed to load generated images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/generated-images?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Failed to delete image (${res.status})`);
      }
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err: any) {
      console.error("Failed to delete image:", err);
      setError(err?.message || "Unable to delete image.");
    }
  };

  return (
    <div className="p-6 md:p-10 text-white max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-red-400" />
            Dashboard / Image Library
          </h1>
          <p className="text-gray-400">
            Browse every SDXL image generated from your blog workflows. Download or prune them anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchImages}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your image history...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/60 border border-red-700 text-red-100 rounded-lg">
          {error}
        </div>
      ) : images.length === 0 ? (
        <div className="p-6 bg-gray-800 border border-gray-700 rounded-xl text-gray-300">
          No images stored yet. Generate a blog asset to populate this library.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col"
            >
              <div className="rounded-t-xl overflow-hidden border-b border-gray-700/60">
                <img
                  src={image.imageUrl}
                  alt={`Generated prompt ${image.prompt}`}
                  className="w-full h-60 object-cover"
                />
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-300">
                  Prompt: <span className="text-gray-100">{image.prompt}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(image.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-3">
                  <a
                    href={image.imageUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GeneratedImagesPage;
