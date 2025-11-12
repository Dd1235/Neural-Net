"use client";
import React, { useState, useCallback } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/generate/Header";
import BlogWorkflowPage from "../components/templates/BlogWorkflowPage";
import NewsRoomWorkflowPage from "../components/templates/NewsRoomWorkflowpage";
import PlaceholderPage from "../components/templates/PlaceholderPage";

const Dashboard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState("blog");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavigate = useCallback((pageId: string) => {
    setCurrentPage(pageId);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case "blog":
        return <BlogWorkflowPage />;
      case "newsroom":
        return <NewsRoomWorkflowPage />;
      default:
        return <PlaceholderPage page={currentPage} />;
      
    }
  };

  return (
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
      />
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="w-full min-h-full">{renderPage()}</div>
      </main>
    </div>
  );
};

export default Dashboard;
