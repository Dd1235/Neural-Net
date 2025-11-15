"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Clipboard,
  Check,
  RotateCcw,
  Sparkles,
  Loader2, // Added a loader icon
} from "lucide-react";

// --- CDN URLs ---
const MAMMOTH_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.11.0/mammoth.browser.min.js";

// --- Helper Types ---
interface RepurposeResults {
  summary: string;
  social_posts: {
    twitter: string;
    linkedin: string;
    instagram: string;
  };
  faq_section: string;
  entities: {
    people: string[];
    organizations: string[];
    topics: string[];
  };
}

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
  rows = 8,
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

const ClipboardCopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);

    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-gray-200"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-5 h-5 text-green-400" />
      ) : (
        <Clipboard className="w-5 h-5" />
      )}
    </button>
  );
};

// --- New Component: FileUploader ---
const FileUploader: React.FC<{
  onFileRead: (text: string, fileName: string) => void; // Pass fileName back
  onClear: () => void;
  fileName: string | null;
  libsLoaded: boolean; // New prop to control loading
  mammoth: any; // Pass mammoth lib
}> = ({ onFileRead, onClear, fileName, libsLoaded, mammoth }) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    setError(null);
    const fileName = file.name;

    const reader = new FileReader();

    if (file.type === "text/plain" || file.type === "text/markdown") {
      reader.onload = (e) => onFileRead(e.target?.result as string, fileName);
      reader.readAsText(file);
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      if (!mammoth) {
        setError("Word document library not loaded. Please wait.");
        return;
      }
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({
            arrayBuffer: e.target?.result as ArrayBuffer,
          });
          onFileRead(result.value, fileName);
        } catch (err) {
          console.error("Error reading .docx file", err);
          setError("Failed to read .docx file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type === "application/pdf") {
      // PDF block is gone, but we'll catch it here
      setError("Unsupported file type. Please use .txt, .md, or .docx");
    } else {
      setError("Unsupported file type. Please use .txt, .md, or .docx");
    }
  };

  const handleDrag = (e: React.DragEvent, over: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(over);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDrag(e, false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Show "Clear" button if a file is loaded
  if (fileName) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center min-w-0">
          <FileText className="w-5 h-5 mr-3 text-green-400 shrink-0" />
          <span className="font-medium truncate" title={fileName}>
            {fileName}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1 text-gray-400 hover:text-white flex shrink-0"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Show loading spinner if libs are not ready
  if (!libsLoaded) {
    return (
      <div className="relative border-2 border-dashed rounded-lg p-12 text-center border-gray-600">
        <Loader2 className="w-12 h-12 mx-auto text-gray-500 animate-spin" />
        <p className="mt-4 text-gray-400">Loading file libraries...</p>
        <p className="text-xs text-gray-500 mt-1">This may take a moment.</p>
      </div>
    );
  }

  // Show uploader
  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        dragOver
          ? "border-red-500 bg-gray-700"
          : "border-gray-600 hover:border-gray-500"
      }`}
      onDragEnter={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDragOver={(e) => handleDrag(e, true)}
      onDrop={handleDrop}
    >
      <UploadCloud className="w-12 h-12 mx-auto text-gray-500" />
      <p className="mt-4 text-gray-400">
        <label
          htmlFor="file-upload"
          className="font-medium text-red-500 hover:text-red-400 cursor-pointer"
        >
          Click to upload
        </label>{" "}
        or drag and drop
      </p>
      <p className="text-xs text-gray-500 mt-1">.txt, .md, or .docx</p>
      <input
        id="file-upload"
        name="file-upload"
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        accept=".txt,.md,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
};

// --- New Component: ResultsDisplay ---
const ResultsDisplay: React.FC<{ results: RepurposeResults }> = ({
  results,
}) => {
  const [activeTab, setActiveTab] = useState("summary");

  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return <pre className="whitespace-pre-wrap">{results.summary}</pre>;
      case "social":
        return (
          <div className="space-y-6">
            <ResultItem title="Twitter" text={results.social_posts.twitter} />
            <ResultItem title="LinkedIn" text={results.social_posts.linkedin} />
            <ResultItem
              title="Instagram"
              text={results.social_posts.instagram}
            />
          </div>
        );
      case "faq":
        return <pre className="whitespace-pre-wrap">{results.faq_section}</pre>;
      case "keywords":
        return (
          <div className="space-y-4">
            <KeywordList title="People" keywords={results.entities.people} />
            <KeywordList
              title="Organizations"
              keywords={results.entities.organizations}
            />
            <KeywordList title="Topics" keywords={results.entities.topics} />
          </div>
        );
      default:
        return null;
    }
  };

  const ResultItem: React.FC<{ title: string; text: string }> = ({
    title,
    text,
  }) => (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-lg font-semibold text-gray-200">{title}</h4>
        <ClipboardCopyButton text={text} />
      </div>
      <pre className="p-4 bg-gray-900 rounded-md whitespace-pre-wrap font-sans">
        {text}
      </pre>
    </div>
  );

  const KeywordList: React.FC<{ title: string; keywords: string[] }> = ({
    title,
    keywords,
  }) => (
    <div>
      <h4 className="text-lg font-semibold text-gray-200 mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-gray-900 text-gray-300 rounded-full text-sm"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );

  const tabs = [
    { id: "summary", name: "Summary" },
    { id: "social", name: "Social Posts" },
    { id: "faq", name: "FAQ Section" },
    { id: "keywords", name: "Keywords" },
  ];

  return (
    <div className="mt-10 bg-gray-800 rounded-xl shadow-lg">
      <div className="border-b border-gray-700">
        <nav className="flex -mb-px p-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mr-4 py-2 px-4 font-medium text-sm rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6 text-gray-200 font-sans">{renderTabContent()}</div>
    </div>
  );
};

// --- END INCLUDED COMPONENTS ---

// --- Main Page Component ---
const ContentRepurposerPage: React.FC = () => {
  const [articleText, setArticleText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<RepurposeResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- State for loaded libraries ---
  const [libsLoaded, setLibsLoaded] = useState(false);
  const mammothRef = useRef<any>(null);
  // pdfjsLibRef removed

  // --- Effect to load CDN scripts ---
  useEffect(() => {
    const onScriptLoad = () => {
      // Script is loaded
      const mammoth = (window as any).mammoth;
      mammothRef.current = mammoth;
      setLibsLoaded(true);
    };

    // Load Mammoth
    const mammothScript = document.createElement("script");
    mammothScript.src = MAMMOTH_CDN_URL;
    mammothScript.onload = onScriptLoad;
    document.body.appendChild(mammothScript);

    // Cleanup
    return () => {
      try {
        document.body.removeChild(mammothScript);
      } catch (e) {
        // Ignore errors on cleanup
      }
    };
  }, []); // Empty dependency array, runs once

  const handleFileRead = (text: string, name: string) => {
    console.log(text);
    setArticleText(text);
    setFileName(name);
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    setArticleText(e.target.value);
    if (fileName) {
      setFileName(null); // Clear file if user starts typing
    }
  };

  const clearInput = () => {
    setArticleText("");
    setFileName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleText) {
      setError("Please upload a file or paste article text to begin.");
      return;
    }
    setLoading(true);
    setResults(null);
    setError(null);

    try {
      // --- Backend API Call ---
      // This is where you call your new Python endpoint
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/repurpose-article`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ article_text: articleText }),
        }
      );

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      setResults(data.repurposed_content); // Assuming backend returns { repurposed_content: ... }
    } catch (err: any) {
      console.error("Error connecting to backend:", err);
      setError(`⚠️ Failed to repurpose content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 md:p-10 text-white max-w-4xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-2">
        Dashboard / Content Repurposer{" "}
      </h1>
      <p className="text-gray-400 mb-8">
        Upload or paste an article to generate a complete content package.
      </p>

      {/* --- Input Section --- */}
      <InputCard title="Upload Article File" icon={<UploadCloud />}>
        <FileUploader
          onFileRead={handleFileRead} // Updated to pass file name
          onClear={clearInput}
          fileName={fileName}
          libsLoaded={libsLoaded}
          mammoth={mammothRef.current}
        />
      </InputCard>

      <div className="text-center text-gray-500 my-4 font-bold">OR</div>

      <InputCard title="Paste Article Text" icon={<FileText />}>
        <TextInput
          label="Paste your full article text below:"
          value={articleText}
          onChange={handleTextChange} // This was the bug from the user's code
          placeholder="Start pasting your article here..."
          isTextArea
          rows={12}
        />
      </InputCard>

      {/* --- Submit Button --- */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={loading || !libsLoaded} // Disable if loading or libs not ready
          className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5 mr-3" />
          {loading ? "Repurposing..." : "Repurpose Content"}
        </button>
      </div>

      {/* --- Error Display --- */}
      {error && (
        <div className="mt-6 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* --- Results Section --- */}
      {results && <ResultsDisplay results={results} />}
    </form>
  );
};

export default ContentRepurposerPage;
