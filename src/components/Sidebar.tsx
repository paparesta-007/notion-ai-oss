"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, LogOut, ChevronDown, ChevronRight, Compass, Home, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageIcon } from "./BlockRenderer";
import { SearchCommand } from "./SearchCommand";

import { Page } from "@/lib/types";

interface SidebarProps {
  pages: Page[];
  selectedPageId?: string;
  isViewingAI: boolean;
  session: {
    workspaceName?: string;
    workspaceIcon?: string;
    ownerName?: string;
    isMock?: boolean;
  };
  daysLeft: number;
  hoursLeft: number;
}

export function Sidebar({
  pages,
  selectedPageId,
  isViewingAI,
  session,
  daysLeft,
  hoursLeft,
}: SidebarProps) {
  // Collapsible sections state
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [teamspacesExpanded, setTeamspacesExpanded] = useState(true);

  // Recents state loaded from localStorage
  const [recentPageIds, setRecentPageIds] = useState<string[]>([]);

  // Sync recents from localStorage on mount and when selectedPageId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem("notion-ai:recent-pages");
      let ids: string[] = stored ? JSON.parse(stored) : [];
      
      // Seed with first few pages if empty
      if (ids.length === 0 && pages.length > 0) {
        ids = pages.slice(0, 8).map((p) => p.id);
        localStorage.setItem("notion-ai:recent-pages", JSON.stringify(ids));
      }
      setRecentPageIds(ids);
    } catch (e) {
      console.error("Error loading recents:", e);
    }
  }, [pages]);

  // Append active page to recents
  useEffect(() => {
    if (!selectedPageId) return;
    try {
      const stored = localStorage.getItem("notion-ai:recent-pages");
      let ids: string[] = stored ? JSON.parse(stored) : [];
      
      // Remove if already exists to push to front
      ids = ids.filter((id) => id !== selectedPageId);
      ids.unshift(selectedPageId);
      
      // Limit to 10 recents
      ids = ids.slice(0, 10);
      
      localStorage.setItem("notion-ai:recent-pages", JSON.stringify(ids));
      setRecentPageIds(ids);
    } catch (e) {
      console.error("Error saving recent page:", e);
    }
  }, [selectedPageId]);

  // Map recent IDs to actual page objects
  const recentPages = recentPageIds
    .map((id) => pages.find((p) => p.id === id))
    .filter((p): p is Page => !!p);

  // Private section contains all pages
  const privatePages = pages;

  // Find dynamic targets for teamspaces
  const hqPage = pages.find((p) => p.title.toLowerCase().includes("notion hq") || p.title.toLowerCase().includes("materie")) || pages[0];
  const dbPage = pages.find((p) => (p as any).isDatabase) || pages[0];

  return (
    <aside className="w-[240px] flex-shrink-0 bg-[#faf9f6] border-r border-[#eae9e4] flex flex-col h-full select-none">
      {/* Workspace Header */}
      <Link href="/" className="p-3.5 flex items-center justify-between border-b border-[#eae9e4] hover:bg-[#f0efea]/60 cursor-pointer transition-colors block">
        <div className="flex items-center gap-2 max-w-[170px] truncate">
          {session.workspaceIcon ? (
            <span className="text-xl flex-shrink-0">{session.workspaceIcon}</span>
          ) : (
            <div className="h-6 w-6 rounded bg-black text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              N
            </div>
          )}
          <div className="flex flex-col truncate">
            <span className="text-[13px] font-bold text-[#37352f] truncate leading-none tracking-tight">
              {session.workspaceName || "Workspace"}
            </span>
            <span className="text-[10px] text-[#7a7a78] mt-1.5 truncate leading-none font-medium">
              {session.ownerName || "Notion Member"}
            </span>
          </div>
        </div>
        
        {/* Connection Pulse indicator */}
        <div className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </div>
      </Link>

      {/* Quick Find (Ctrl+K) Search trigger bar */}
      <SearchCommand pages={pages} />

      {/* Notion AI Chatbot shortcut item */}
      <div className="px-2 py-1.5 border-b border-[#eae9e4]">
        <Link 
          href="/?ai=true"
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors block",
            !selectedPageId && isViewingAI
              ? "bg-[#e5e4de] text-[#1a1a1a]" 
              : "text-[#37352f] hover:bg-[#f0efea]/60"
          )}
        >
          <div className="flex items-center gap-2.5 w-full">
            <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="flex-1 text-left font-sans text-[13px]">Notion AI Chatbot</span>
            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-95 font-sans">New</span>
          </div>
        </Link>
      </div>

      {/* Scrollable Navigation section */}
      <div className="flex-1 py-3 px-2 space-y-4 overflow-y-auto scrollbar-none">
        
        {/* 1. RECENTS SECTION */}
        <div className="space-y-1">
          <button
            onClick={() => setRecentsExpanded(!recentsExpanded)}
            className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#f0efea]/40 rounded text-[11px] font-bold text-[#7a7a78] tracking-wider uppercase"
          >
            <span>Recents</span>
            {recentsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>
          
          {recentsExpanded && (
            <div className="space-y-0.5 animate-slide-in">
              {recentPages.length > 0 ? (
                recentPages.map((page) => {
                  const isActive = page.id === selectedPageId;
                  return (
                    <Link
                      key={`recent-${page.id}`}
                      href={`/?pageId=${page.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors truncate",
                        isActive
                          ? "bg-[#e5e4de] text-[#1a1a1a] font-semibold"
                          : "text-[#5f5e5a] hover:bg-[#f0efea]/60 hover:text-[#1a1a1a]"
                      )}
                    >
                      <PageIcon emoji={page.emoji} className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{page.title}</span>
                    </Link>
                  );
                })
              ) : (
                <span className="text-[11px] text-[#a4a3a1] px-2.5 py-1 block italic select-none">No recently viewed pages</span>
              )}
            </div>
          )}
        </div>

        {/* 2. PRIVATE SECTION */}
        <div className="space-y-1">
          <button
            onClick={() => setPrivateExpanded(!privateExpanded)}
            className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#f0efea]/40 rounded text-[11px] font-bold text-[#7a7a78] tracking-wider uppercase"
          >
            <span>Private</span>
            {privateExpanded ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>
          
          {privateExpanded && (
            <div className="space-y-0.5 animate-slide-in">
              {privatePages.length > 0 ? (
                privatePages.map((page) => {
                  const isActive = page.id === selectedPageId;
                  return (
                    <Link
                      key={`private-${page.id}`}
                      href={`/?pageId=${page.id}`}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors truncate",
                        isActive
                          ? "bg-[#e5e4de] text-[#1a1a1a] font-semibold"
                          : "text-[#5f5e5a] hover:bg-[#f0efea]/60 hover:text-[#1a1a1a]"
                      )}
                    >
                      <PageIcon emoji={page.emoji} className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{page.title}</span>
                    </Link>
                  );
                })
              ) : (
                <span className="text-[11px] text-[#a4a3a1] px-2.5 py-1 block italic select-none">No pages found</span>
              )}
            </div>
          )}
        </div>

        {/* 3. TEAMSPACES SECTION */}
        <div className="space-y-1">
          <button
            onClick={() => setTeamspacesExpanded(!teamspacesExpanded)}
            className="w-full flex items-center justify-between px-2 py-1 hover:bg-[#f0efea]/40 rounded text-[11px] font-bold text-[#7a7a78] tracking-wider uppercase"
          >
            <span>Teamspaces</span>
            {teamspacesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
          </button>
          
          {teamspacesExpanded && (
            <div className="space-y-0.5 animate-slide-in">
              <Link
                href={hqPage ? `/?pageId=${hqPage.id}` : "/"}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors truncate",
                  hqPage && selectedPageId === hqPage.id
                    ? "bg-[#e5e4de] text-[#1a1a1a] font-semibold"
                    : "text-[#5f5e5a] hover:bg-[#f0efea]/60 hover:text-[#1a1a1a]"
                )}
              >
                <Home className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span className="truncate">Tommaso's Notion HQ</span>
              </Link>
              <Link
                href={dbPage ? `/?pageId=${dbPage.id}` : "/"}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors truncate",
                  dbPage && selectedPageId === dbPage.id
                    ? "bg-[#e5e4de] text-[#1a1a1a] font-semibold"
                    : "text-[#5f5e5a] hover:bg-[#f0efea]/60 hover:text-[#1a1a1a]"
                )}
              >
                <Compass className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <span className="truncate">Teamspace Home</span>
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Sidebar Footer - Diagnostics Console */}
      <div className="p-3 border-t border-[#eae9e4] bg-[#faf9f6] space-y-3 flex-shrink-0">
        
        {/* Brutalist HUD panel */}
        <div className="bg-[#f0efea]/50 border border-[#eae9e4] rounded-lg p-2.5 font-mono text-[9px] text-[#7a7a78] space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#37352f] uppercase select-none">
            <Terminal className="w-3 h-3 text-neutral-500" />
            <span>Session Diagnostics</span>
          </div>
          <div className="flex justify-between border-t border-[#eae9e4]/60 pt-1">
            <span>CONNECTION:</span>
            <span className="font-bold text-emerald-600">ONLINE</span>
          </div>
          <div className="flex justify-between">
            <span>NOTION API:</span>
            <span className="font-bold text-[#37352f]">CONNECTED</span>
          </div>
          <div className="flex justify-between">
            <span>SESSION TIME:</span>
            <span className="font-bold text-purple-700">
              {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h remaining`}
            </span>
          </div>
        </div>

        {/* Log Out Button */}
        <a
          href="/api/auth/logout"
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-[#eae9e4] rounded-md text-xs font-semibold bg-white hover:bg-[#faf9f6] hover:border-red-200 active:bg-[#e5e4de] transition-all text-[#d44] hover:text-[#c33] cursor-pointer shadow-sm select-none"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </a>
      </div>
    </aside>
  );
}
