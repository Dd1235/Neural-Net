"use client";
import React from "react";
import {
  Menu,
  X,
  CheckCircle,
  MessageSquare,
  Newspaper,
  FileText,
  Settings,
  Home,
  Zap,
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const navItems = [
    { id: "streamlit.app", label: "Streamlit.app", icon: Home },
    { id: "root", label: "Root", icon: FileText },
    { id: "ping", label: "Ping", icon: Zap },
    { id: "health", label: "Health", icon: CheckCircle },
    { id: "agents", label: "Agents", icon: MessageSquare },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "content", label: "Content", icon: FileText },
    { id: "blog_workflow", label: "Blog Workflow", icon: FileText },
    { id: "newsroom", label: "Newsroom", icon: Newspaper },
    { id: "blog", label: "Blog", icon: FileText },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-70 z-20 md:hidden transition-opacity ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onToggleSidebar}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 w-64 bg-gray-900 z-30 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex-shrink-0 md:shadow-2xl border-r border-gray-700/50`}
      >
        <div className="p-4 flex justify-between items-center border-b border-gray-700 md:hidden">
          <span className="text-xl font-bold text-white">Dashboard</span>
          <button onClick={onToggleSidebar} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 text-sm font-semibold text-gray-500 uppercase border-b border-gray-700">
          Dashboard
        </div>

        <nav className="space-y-1 p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (isSidebarOpen) onToggleSidebar();
              }}
              className={`w-full text-left flex items-center px-3 py-2 rounded-lg transition-all duration-150 ${
                currentPage === item.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
