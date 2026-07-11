"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CornerDownLeft, SlidersHorizontal, Settings, ArrowUpRight, HelpCircle, User, Folder, Layers, Table, BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Page } from "@/lib/types";

interface SearchCommandProps {
  pages: Page[];
}

function PageIcon({ emoji, className = "w-4 h-4" }: { emoji?: string | null; className?: string }) {
  if (emoji && emoji.length > 0 && !["📄", "🔗", "📎"].includes(emoji)) {
    return <span className="text-base flex-shrink-0 leading-none">{emoji}</span>;
  }
  return <FileText className={cn(className, "text-[#7a7a78] flex-shrink-0")} />;
}

// Date helpers for timeline grouping
function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  
  // Try parsing dd/mm/yyyy or mm/dd/yyyy
  const parts = str.split("/");
  if (parts.length === 3) {
    const d2 = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function isToday(str: string): boolean {
  const d = parseDate(str);
  if (!d) return false;
  const today = new Date();
  return d.getDate() === today.getDate() && 
         d.getMonth() === today.getMonth() && 
         d.getFullYear() === today.getFullYear();
}

function isYesterday(str: string): boolean {
  const d = parseDate(str);
  if (!d) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() && 
         d.getMonth() === yesterday.getMonth() && 
         d.getFullYear() === yesterday.getFullYear();
}

function isPastWeek(str: string): boolean {
  const d = parseDate(str);
  if (!d) return false;
  const diffTime = Math.abs(new Date().getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

function isPastMonth(str: string): boolean {
  const d = parseDate(str);
  if (!d) return false;
  const diffTime = Math.abs(new Date().getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30;
}

function getTimelineGroup(page: Page): "Today" | "Yesterday" | "Past week" | "Past 30 days" | "Older" {
  const dateStr = page.last_edited || page.created;
  if (!dateStr) return "Older";

  const lower = dateStr.toLowerCase();
  if (lower.includes("min") || lower.includes("hour") || lower.includes("today") || isToday(dateStr)) {
    return "Today";
  }
  if (lower.includes("yesterday") || isYesterday(dateStr)) {
    return "Yesterday";
  }
  if (lower.includes("day") || lower.includes("week") || isPastWeek(dateStr)) {
    return "Past week";
  }
  if (lower.includes("month") || isPastMonth(dateStr)) {
    return "Past 30 days";
  }
  return "Older";
}

// Compute the path: e.g. Parent / Child / Current
function getPagePath(page: Page, allPages: Page[]): string {
  const pathParts: string[] = [];
  let currentParentId: string | undefined = page.parentId;

  // Follow parentId links recursively
  while (currentParentId) {
    const pId: string = currentParentId;
    const parent = allPages.find((p) => p.id === pId);
    if (parent) {
      pathParts.unshift(parent.title);
      currentParentId = parent.parentId;
    } else {
      break;
    }
  }

  if (pathParts.length > 2) {
    return `${pathParts[0]} / ... / ${pathParts[pathParts.length - 1]}`;
  }
  return pathParts.join(" / ");
}

export function SearchCommand({ pages }: SearchCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [filteredPages, setFilteredPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters state
  const [titleOnly, setTitleOnly] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Toggle modal on Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle key navigation inside the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredPages.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredPages.length) % Math.max(1, filteredPages.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredPages[activeIndex]) {
          handleSelectPage(filteredPages[activeIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, filteredPages]);

  // Focus input when modal opens, and initialize pages list
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setFilteredPages(pages);
      setActiveIndex(0);
    }
  }, [isOpen, pages]);

  // Dynamic Notion search with debouncing
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setFilteredPages(pages);
      setIsLoading(false);
      setActiveIndex(0);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setFilteredPages(data.pages || []);
        }
      } catch (err) {
        console.error("Error executing dynamic search:", err);
      } finally {
        setIsLoading(false);
        setActiveIndex(0);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen, pages]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector("[data-active='true']") as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleSelectPage = (pageId: string) => {
    setIsOpen(false);
    router.push(`/?pageId=${pageId}`);
  };

  const selectedPage = filteredPages[activeIndex];

  // Group pages by timeline
  const groups: Record<string, Page[]> = {
    "Today": [],
    "Yesterday": [],
    "Past week": [],
    "Past 30 days": [],
    "Older": []
  };

  filteredPages.forEach((page) => {
    const group = getTimelineGroup(page);
    groups[group].push(page);
  });

  // Keep flat index mappings to associate activeIndex with grouped rendering
  let globalIndexCounter = 0;

  return (
    <>
      {/* Sidebar Trigger Button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-full text-left focus:outline-none"
        >
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#7a7a78] pointer-events-none" />
          <div className="pl-8 pr-2 h-8 flex items-center justify-between text-sm bg-[#f0efea]/40 border border-[#eae9e4] text-[#7a7a78] rounded-md hover:bg-[#f0efea]/80 hover:text-[#37352f] transition-all cursor-pointer select-none">
            <span className="font-medium text-[13px]">Search page...</span>
            <kbd className="pointer-events-none inline-flex h-[18px] select-none items-center gap-0.5 rounded border border-[#eae9e4] bg-white px-1.5 font-mono text-[9px] font-medium text-[#8a8a88] shadow-sm">
              <span className="text-[8px]">Ctrl</span>K
            </kbd>
          </div>
        </button>
      </div>

      {/* Modal Dialog overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-[#000000]/40 backdrop-blur-[2px] transition-all animate-fade-in"
          />

          {/* Dialog Container */}
          <div className="bg-white rounded-xl shadow-2xl border border-[#edece9] overflow-hidden flex flex-col h-[580px] w-full max-w-5xl animate-scale-in relative z-10">
            
            {/* Top Search Input Bar */}
            <div className="flex items-center px-5 py-4 border-b border-[#edece9] gap-3">
              <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or ask a question in Tommaso's Notion..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-[15px] text-[#37352f] placeholder-[#a4a3a1] bg-transparent outline-none border-none py-0.5 w-full font-sans"
              />
              
              <div className="flex items-center gap-2 flex-shrink-0 select-none">
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mr-1"></div>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-[#edece9] rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center px-5 py-2.5 border-b border-[#edece9] gap-2 select-none bg-[#faf9f6]/30 text-xs">
              <button
                onClick={() => setTitleOnly(!titleOnly)}
                className={cn(
                  "px-2.5 py-1 rounded-md border font-medium transition-all flex items-center gap-1.5",
                  titleOnly
                    ? "bg-[#e5e4de] border-[#d1cfc7] text-[#1a1a1a]"
                    : "border-transparent text-[#7a7a78] hover:bg-[#edece9]/50"
                )}
              >
                <span>Aa</span> Title only
              </button>

              <div className="h-4 w-[1px] bg-neutral-200 mx-1" />

              {/* Static visual filter tags (Exclude Created by, In, + Filter logic as requested) */}
              <button className="px-2.5 py-1 rounded-md border border-[#edece9] text-[#5f5e5a] hover:bg-[#edece9]/50 transition-all flex items-center gap-1.5 font-medium cursor-not-allowed opacity-80">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                Created by <span className="text-neutral-400">▼</span>
              </button>

              <button className="px-2.5 py-1 rounded-md border border-[#edece9] text-[#5f5e5a] hover:bg-[#edece9]/50 transition-all flex items-center gap-1.5 font-medium cursor-not-allowed opacity-80">
                <Folder className="w-3.5 h-3.5 text-neutral-400" />
                In <span className="text-neutral-400">▼</span>
              </button>

              <button className="px-2.5 py-1 rounded-md border border-[#edece9] text-neutral-400 hover:bg-[#edece9]/50 transition-all flex items-center gap-1.5 font-medium cursor-not-allowed opacity-80">
                <span>+</span> Filter
              </button>
            </div>

            {/* Two-Column split body (Left results, Right preview) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left column: grouped scrollable search list */}
              <div 
                className="w-[55%] border-r border-[#edece9] overflow-y-auto p-3 space-y-4"
                ref={resultsContainerRef}
              >
                {filteredPages.length > 0 ? (
                  Object.keys(groups).map((groupName) => {
                    const groupItems = groups[groupName];
                    if (groupItems.length === 0) return null;

                    return (
                      <div key={groupName} className="space-y-1">
                        <div className="text-[10px] font-bold text-[#7a7a78] px-2.5 py-1 select-none tracking-wider uppercase">
                          {groupName}
                        </div>

                        {groupItems.map((page) => {
                          const currentIndex = globalIndexCounter;
                          globalIndexCounter++;
                          const isActive = currentIndex === activeIndex;
                          const path = getPagePath(page, pages);

                          return (
                            <div
                              key={page.id}
                              data-active={isActive ? "true" : "false"}
                              onClick={() => handleSelectPage(page.id)}
                              onMouseEnter={() => setActiveIndex(currentIndex)}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all select-none gap-3 border",
                                isActive
                                  ? "bg-[#f0efea]/80 border-[#d1cfc7] shadow-sm"
                                  : "border-transparent hover:bg-[#edece9]/40"
                              )}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-5.5 h-5.5 rounded bg-white border border-[#edece9] flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <PageIcon emoji={page.emoji} className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className={cn(
                                    "text-[13px] truncate",
                                    isActive ? "font-semibold text-[#1a1a1a]" : "text-[#37352f]"
                                  )}>
                                    {page.title}
                                  </span>
                                  {path && (
                                    <span className="text-[10px] text-neutral-400 font-medium truncate flex-shrink-0">
                                      — {path}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 px-4">
                    <span className="text-3xl block mb-2">🔍</span>
                    <p className="text-sm font-bold text-[#37352f]">No pages match your search</p>
                    <p className="text-xs text-[#7c7b77] mt-1 max-w-[280px] mx-auto leading-relaxed">
                      Try searching for a different keyword or check your Notion connection.
                    </p>
                  </div>
                )}
              </div>

              {/* Right column: premium mini-preview card */}
              <div className="w-[45%] bg-[#faf9f6] flex flex-col overflow-y-auto p-6 items-center justify-start select-none">
                {selectedPage ? (
                  <div className="w-full max-w-sm bg-white rounded-xl border border-[#edece9] shadow-md overflow-hidden flex flex-col transition-all relative">
                    
                    {/* Link button at top-right corner */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPage(selectedPage.id);
                      }}
                      className="absolute top-3 right-3 z-20 flex items-center justify-center bg-white/90 hover:bg-white text-neutral-600 hover:text-black border border-[#edece9] rounded-md px-2 py-1 gap-1 text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <span>🔗</span>
                      <span>↗</span>
                    </button>

                    {/* Page Cover Banner Image */}
                    <div className="h-28 w-full bg-gradient-to-r from-neutral-200 to-neutral-300 relative overflow-hidden flex-shrink-0 border-b border-[#edece9]">
                      {selectedPage.cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={selectedPage.id}
                          src={selectedPage.cover}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Fallback Banner matching screenshot style */
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={`default-${selectedPage.id}`}
                          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=600"
                          alt="Default Cover"
                          className="w-full h-full object-cover opacity-85"
                        />
                      )}
                    </div>

                    {/* Content Details Area */}
                    <div className="px-5 pb-5 pt-3 relative flex flex-col flex-1">
                      
                      {/* Floating Emoji Icon overlay */}
                      <div className="absolute -top-6 left-5 w-12 h-12 bg-white border border-[#edece9] rounded-xl flex items-center justify-center shadow-md z-10">
                        {selectedPage.emoji ? (
                          <span className="text-2xl leading-none">{selectedPage.emoji}</span>
                        ) : (
                          <FileText className="w-6 h-6 text-[#7a7a78]" />
                        )}
                      </div>

                      {/* Path & Title Details */}
                      <div className="mt-8 flex flex-col space-y-1">
                        <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider truncate">
                          {getPagePath(selectedPage, pages) || "Workspace Root"}
                        </div>
                        <h3 className="text-base font-bold text-neutral-800 tracking-tight leading-snug">
                          {selectedPage.title}
                        </h3>
                      </div>

                      <hr className="border-neutral-100 my-3.5" />

                      {/* Mock Layout blocks representing page content */}
                      <div className="flex-1 flex flex-col justify-start">
                        {selectedPage.isDatabase ? (
                          /* Simulated Database Table view */
                          <div className="border border-[#edece9] rounded-lg p-2.5 bg-[#faf9f6]/40 space-y-2">
                            <div className="flex justify-between items-center select-none">
                              <span className="text-[10px] font-bold text-[#7a7a78] uppercase tracking-wider flex items-center gap-1">
                                <Table className="w-3 h-3 text-neutral-500" /> Database View
                              </span>
                              <span className="h-2 w-7 bg-blue-500 rounded" />
                            </div>
                            <div className="border-t border-[#edece9] pt-2 space-y-1.5">
                              <div className="flex gap-2 items-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                                <div className="h-2 bg-neutral-200 rounded w-16" />
                                <div className="h-2 bg-neutral-100 rounded w-20 ml-auto" />
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                                <div className="h-2 bg-neutral-200 rounded w-20" />
                                <div className="h-2 bg-neutral-100 rounded w-12 ml-auto" />
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                                <div className="h-2 bg-neutral-200 rounded w-12" />
                                <div className="h-2 bg-neutral-100 rounded w-16 ml-auto" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Simulated Page Paragraph lines */
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#7a7a78] uppercase tracking-wider select-none mb-1">
                              <BookOpen className="w-3 h-3 text-neutral-500" /> Page Content
                            </div>
                            <div className="space-y-2">
                              <div className="h-2.5 bg-neutral-100 rounded w-[90%]" />
                              <div className="h-2.5 bg-neutral-100 rounded w-[75%]" />
                              <div className="h-2.5 bg-neutral-100 rounded w-[85%]" />
                              <div className="h-2.5 bg-neutral-100 rounded w-[50%]" />
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[#7c7b77]">
                    <HelpCircle className="w-8 h-8 text-neutral-300 mb-2" />
                    <span className="text-xs">Highlight a page to view its mini-preview</span>
                  </div>
                )}
              </div>

            </div>

            {/* Dialog Footer shortcuts bar */}
            <div className="px-5 py-2.5 border-t border-[#edece9] bg-[#faf9f6]/90 flex items-center justify-between text-[11px] text-[#7a7a78] select-none">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium">
                  <kbd className="bg-white border border-[#edece9] px-1 rounded shadow-sm font-mono font-bold text-[9px]">Ctrl+↵</kbd>
                  Open in new tab
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>Total pages: {pages.length}</span>
                <span className="text-neutral-300">•</span>
                <button className="hover:text-neutral-700 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
