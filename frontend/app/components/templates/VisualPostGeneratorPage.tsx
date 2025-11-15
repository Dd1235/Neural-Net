"use client";
import React, { useState, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  Clipboard,
  Check,
  Sparkles,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

// --- START INCLUDED COMPONENTS ---
// Reusable components are defined here to make the file self-contained.

const InputCard: React.FC<{
  title: string;
  icon?: React.ReactElement;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
    <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
      {icon && <span className="w-5 h-5 mr-3 shrink-0">{icon}</span>}
      {title}
    </h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  placeholder: string;
  isTextArea?: boolean;
  rows?: number;
}> = ({
  label,
  value,
  onChange,
  placeholder,
  isTextArea = false,
  rows = 4,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      {label}
    </label>
    {isTextArea ? (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
      />
    )}
  </div>
);

const SelectInput: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
    >
      {children}
    </select>
  </div>
);

// --- END INCLUDED COMPONENTS ---

// Helper to read file as Base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const VisualPostGeneratorPage: React.FC = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setResult(null);
    setError(null);
    setImagePreview(URL.createObjectURL(file));

    // Convert to Base64 for the API
    try {
      const base64String = await toBase64(file);
      setImageBase64(base64String);
    } catch (err) {
      setError("Failed to read image file.");
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64 || !context) {
      setError("Please upload an image and provide text context.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/generate-visual-post`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: imageBase64,
            context: context,
            platform: platform,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Error: ${await res.text()}`);
      }

      const data = await res.json();
      setResult(data.generated_post);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 md:p-10 text-white max-w-4xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-8">Visual Content Generator</h1>

      {/* --- Image Uploader --- */}
      <InputCard title="1. Upload Image" icon={<ImageIcon />}>
        <input
          type="file"
          id="image-upload"
          className="sr-only"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
        />
        <label
          htmlFor="image-upload"
          className="w-full h-64 bg-gray-900 rounded-lg border-2 border-dashed border-gray-600 cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:bg-gray-700 hover:border-gray-500 transition-colors"
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Upload preview"
              className="max-h-full rounded-lg"
            />
          ) : (
            <>
              <UploadCloud className="w-12 h-12" />
              <p className="mt-2">Click or drag to upload an image</p>
            </>
          )}
        </label>
      </InputCard>

      {/* --- Text Context --- */}
      <InputCard title="2. Add Context" icon={<FileText />}>
        <TextInput
          label="What is this post about?"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g., Announcing our new product, 'MegaWidget 5000'!"
          isTextArea
        />
      </InputCard>

      {/* --- Platform Selector --- */}
      <InputCard title="3. Select Platform" icon={<Sparkles />}>
        <SelectInput
          label="Generate post for:"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="linkedin">LinkedIn</option>
          <option value="twitter">Twitter / X</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
        </SelectInput>
      </InputCard>

      {/* --- Submit Button --- */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={loading || !imageBase64 || !context}
          className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-xl hover:bg-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 mr-3" />
          )}
          {loading ? "Generating..." : "Generate Post"}
        </button>
      </div>

      {/* --- Result --- */}
      {error && (
        <p className="mt-6 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-10 p-6 bg-gray-800 rounded-xl">
          <h2 className="text-xl font-bold mb-3">Generated Post:</h2>
          <pre className="text-gray-200 whitespace-pre-wrap font-sans">
            {result}
          </pre>
        </div>
      )}
    </form>
  );
};

export default VisualPostGeneratorPage;
