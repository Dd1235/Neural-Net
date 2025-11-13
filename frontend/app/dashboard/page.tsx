"use client";
import React, { useState, useCallback, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/generate/Header";
import BlogWorkflowPage from "../components/templates/BlogWorkflowPage";
import NewsRoomWorkflowPage from "../components/templates/NewsRoomWorkflowpage";
import PlaceholderPage from "../components/templates/PlaceholderPage";
import ContentPage from "../components/templates/ContentPage";

// -------------------
// Auth Context
// -------------------
export const AuthContext = createContext<any>(null);

export const useAuth = () => useContext(AuthContext);

// -------------------
// Dashboard Component
// -------------------
const Dashboard: React.FC = () => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState("blog");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // Logged-in user info

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

  const renderPage = () => {
    switch (currentPage) {
      case "blog":
        return <BlogWorkflowPage />; // user can be accessed via AuthContext
      case "newsroom":
        return <NewsRoomWorkflowPage />;
      case "content":
        return <ContentPage />;
      default:
        return <PlaceholderPage page={currentPage} />;
    }
  };

  // Don't render dashboard until user info is loaded
  if (!user) return null;

  return (
    <AuthContext.Provider value={user}>
      <div className="min-h-screen flex bg-gray-900 font-sans">
        <Header onToggleSidebar={handleToggleSidebar} currentPage={currentPage} />
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
        />
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
          <div className="w-full min-h-full">{renderPage()}</div>
        </main>
      </div>
    </AuthContext.Provider>
  );
};

export default Dashboard;
