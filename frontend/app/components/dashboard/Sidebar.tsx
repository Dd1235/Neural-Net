"use client";
import Link from "next/link";
import React from "react";
import {
  X,
  CheckCircle,
  Newspaper,
  FileText,
  Home,
  Youtube,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isSidebarOpen,
  onToggleSidebar,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "blog", label: "Blog Workflow", icon: FileText },
    { id: "newsroom", label: "Newsroom", icon: Newspaper },
    { id: "content", label: "Content Repurposer", icon: CheckCircle },
    { id: "youtube_blog", label: "YouTube Blog", icon: Youtube },
    { id: "image_library", label: "Image Library", icon: ImageIcon },
    { id: "visual_post", label: "Visual Post Caption", icon: ImageIcon },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-70 z-20 md:hidden transition-opacity ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onToggleSidebar}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 w-64 bg-gray-900 z-30 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex-shrink-0 md:shadow-2xl border-r border-gray-700/50 ${
          isCollapsed ? "md:w-24" : "md:w-64"
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b border-gray-700 md:hidden">
          <span className="text-xl font-bold text-white">Dashboard</span>
          <button
            onClick={onToggleSidebar}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-800 flex flex-col gap-2">
          {/* TOP ROW WITH BACK + COLLAPSE BUTTON */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => isSidebarOpen && onToggleSidebar()}
              className="flex items-center gap-3 rounded-xl border border-gray-700/60 bg-gray-800/40 px-3 py-2 text-sm font-semibold text-gray-100 shadow-inner shadow-black/20 transition hover:border-purple-400/40 hover:bg-gray-800/70"
            >
              <Home className="w-5 h-5" />
              {!isCollapsed && (
                <span>
                  Back to <span className="text-purple-200">Landing</span>
                </span>
              )}
            </Link>

            {/* COLLAPSE BUTTON - ONLY SHOWN ON MD+ */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex items-center justify-center rounded-xl border border-gray-700 p-2 text-gray-300 hover:border-gray-500 hover:text-white"
            >
              {isCollapsed ? (
                <PanelRight className="w-5 h-5" />
              ) : (
                <PanelLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Dashboard label */}
          <div
            className={`text-xs font-semibold uppercase tracking-wide text-gray-500 ${
              isCollapsed ? "text-center" : ""
            }`}
          >
            Dashboard
          </div>
        </div>

        <nav className="space-y-1 p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isSidebarOpen) onToggleSidebar();
              }}
              className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-150 ${
                isCollapsed ? "justify-center" : "justify-start text-left"
              } ${
                currentPage === item.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${isCollapsed ? "mx-auto" : "mr-3"}`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
