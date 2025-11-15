"use client";
import React, {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react";
import { useRouter } from "next/navigation";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/generate/Header";
import BlogWorkflowPage from "../components/templates/BlogWorkflowPage";
import GeneratedImagesPage from "../components/templates/GeneratedImagesPage";
import NewsRoomWorkflowPage from "../components/templates/NewsRoomWorkflowpage";
import PlaceholderPage from "../components/templates/PlaceholderPage";
import ContentPage from "../components/templates/ContentPage";
import YoutubeScriptPage from "../components/templates/YoutubeScriptPage";
import ContentRepurposerPage from "../components/templates/ContentRepurposerPage";
import YouTubeBlogPage from "../components/templates/YouTubeBlogPage";
import HomePage from "../components/templates/HomePage";
import VisualPostGeneratorPage from "../components/templates/VisualPostGeneratorPage";
import XPostWorkflowPage from "../components/templates/XPostWorkflowPage";
import AccountSettingsPage from "../components/templates/AccountSettingsPage";
import TextToAudioPage from "../components/templates/TextToAudioPage";

// -------------------
// Auth Context
// -------------------
interface DashboardUser {
  id: number;
  username: string;
  email: string;
  hasXCredentials?: boolean;
  createdAt?: string;
}

export const AuthContext = createContext<DashboardUser | null>(null);

export const useAuth = () => useContext(AuthContext);

// -------------------
// Dashboard Component
// -------------------
const Dashboard: React.FC = () => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null); // Logged-in user info

  // Route protection & fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/");
        }
      } catch (err) {
        router.push("/");
      }
    };
    fetchUser();
  }, [router]);

  const handleNavigate = useCallback((pageId: string) => {
    setCurrentPage(pageId);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  }, [router]);

  const handleCredentialsChange = useCallback((hasKeys: boolean) => {
    setUser((prev) => (prev ? { ...prev, hasXCredentials: hasKeys } : prev));
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "blog":
        return <BlogWorkflowPage />; // user can be accessed via AuthContext
      case "newsroom":
        return <NewsRoomWorkflowPage />;
      case "content":
        return <ContentPage />;
      case "youtube_script":
        return <YoutubeScriptPage />;
      case "image_library":
        return <GeneratedImagesPage />;
      case "youtube_blog":
        return <YouTubeBlogPage />;
      case "visual_post":
        return <VisualPostGeneratorPage />;
      case "x_post":
        return <XPostWorkflowPage currentUser={user} />;
      case "text_audio":
        return <TextToAudioPage />;
      case "account":
        return (
          <AccountSettingsPage
            user={user}
            onLogout={handleLogout}
            onCredentialsChange={handleCredentialsChange}
          />
        );
      default:
        return <PlaceholderPage page={currentPage} />;
    }
  };

  // Don't render dashboard until user info is loaded
  if (!user) return null;

  return (
    <AuthContext.Provider value={user}>
      <div className="min-h-screen flex bg-gray-900 font-sans">
        <Header
          onToggleSidebar={handleToggleSidebar}
          currentPage={currentPage}
        />
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
          <div className="w-full min-h-full">{renderPage()}</div>
        </main>
      </div>
    </AuthContext.Provider>
  );
};

export default Dashboard;
