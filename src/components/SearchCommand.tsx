"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CornerDownLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Page {
  id: string;
  title: string;
  url: string;
  created: string;
  last_edited: string;
  emoji: string | null;
}

interface SearchCommandProps {
  pages: Page[];
}

function PageIcon({ emoji, className = "w-4 h-4" }: { emoji?: string | null; className?: string }) {
  if (emoji && emoji.length > 0 && !["📄", "🔗", "📎"].includes(emoji)) {
    return <span className="text-base flex-shrink-0 leading-none">{emoji}</span>;
  }
  return <FileText className={cn(className, "text-[#7a7a78] flex-shrink-0")} />;
}

export function SearchCommand({ pages }: SearchCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [filteredPages, setFilteredPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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
      setFilteredPages(pages.slice(0, 5));
      setActiveIndex(0);
    }
  }, [isOpen, pages]);

  // Dynamic Notion search with debouncing
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setFilteredPages(pages.slice(0, 5));
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
    if (resultsRef.current) {
      const activeEl = resultsRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleSelectPage = (pageId: string) => {
    setIsOpen(false);
    router.push(`/?pageId=${pageId}`);
  };

  return (
    <>
      {/* Sidebar Trigger Button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-full text-left focus:outline-none"
        >
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#7a7a78] pointer-events-none" />
          <div className="pl-8 pr-2 h-8 flex items-center justify-between text-sm bg-[#edece9]/30 border border-[#edece9] text-[#7a7a78] rounded-md hover:bg-[#edece9]/60 hover:text-[#37352f] transition-all cursor-pointer select-none">
            <span className="font-medium text-[13px]">Quick Find...</span>
            <kbd className="pointer-events-none inline-flex h-[18px] select-none items-center gap-0.5 rounded border border-[#e3e2e0] bg-white px-1.5 font-mono text-[9px] font-medium text-[#8a8a88] shadow-sm">
              <span className="text-[8px]">Ctrl</span>K
            </kbd>
          </div>
        </button>
      </div>

      {/* Modal Dialog portal-like overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-[#000000]/40 backdrop-blur-[2px] transition-all animate-fade-in"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-[#edece9] overflow-hidden flex flex-col max-h-[500px] w-full max-w-2xl animate-scale-in">
              {/* Search Header */}
              <div className="flex items-center px-4 py-3 border-b border-[#edece9] gap-3">
                <Search className="w-4 h-4 text-[#7a7a78] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages by title..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                  className="flex-1 text-sm text-[#37352f] placeholder-[#a4a3a1] bg-transparent outline-none border-none py-1 w-full"
                />
                
                {/* Control Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
                  {isLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mr-1"></div>
                  )}
                  {query && !isLoading && (
                    <button 
                      onClick={() => {
                        setQuery("");
                        inputRef.current?.focus();
                      }}
                      className="p-1 hover:bg-[#edece9] rounded text-[#7a7a78] transition-colors"
                    >
                      <span className="text-xs font-bold font-sans">×</span>
                    </button>
                  )}
                  <span className="text-[10px] font-medium text-[#7a7a78] bg-[#f7f7f5] border border-[#edece9] px-2 py-0.5 rounded shadow-sm">
                    Esc to close
                  </span>
                </div>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto p-2" ref={resultsRef}>
                {filteredPages.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-[#7a7a78] px-3 py-1.5 uppercase tracking-wider">
                      {query ? "Search Results" : "Recent Pages"}
                    </div>
                    
                    {filteredPages.map((page, index) => {
                      const isActive = index === activeIndex;
                      return (
                        <div
                          key={page.id}
                          onClick={() => handleSelectPage(page.id)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none gap-3",
                            isActive 
                              ? "bg-[#f7f7f5] border border-[#edece9] shadow-sm" 
                              : "border border-transparent hover:bg-[#f7f7f5]/40"
                          )}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-6 h-6 rounded bg-[#edece9]/50 flex items-center justify-center flex-shrink-0">
                              <PageIcon emoji={page.emoji} className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col truncate">
                              <span className={cn(
                                "text-sm truncate",
                                isActive ? "font-semibold text-[#1a1a1a]" : "text-[#37352f]"
                              )}>
                                {page.title}
                              </span>
                              <span className="text-[10px] text-[#7a7a78] mt-0.5">
                                Created: {page.created} • Edited: {page.last_edited}
                              </span>
                            </div>
                          </div>

                          {isActive && (
                            <div className="flex items-center gap-1 text-[10px] text-[#7a7a78] font-medium animate-fade-in bg-white border border-[#edece9] px-1.5 py-0.5 rounded shadow-sm">
                              <span>Select</span>
                              <CornerDownLeft className="w-2.5 h-2.5 text-[#8a8a88]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4">
                    <span className="text-2xl block mb-2">🔍</span>
                    <p className="text-sm font-semibold text-[#37352f]">No pages match your search</p>
                    <p className="text-xs text-[#7c7b77] mt-1 max-w-[280px] mx-auto leading-relaxed">
                      Try searching for a different keyword or title in your Notion integration.
                    </p>
                  </div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="px-4 py-2 border-t border-[#edece9] bg-[#f7f7f5]/80 flex items-center justify-between text-[10px] text-[#7a7a78] select-none">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white border border-[#edece9] px-1 rounded shadow-sm font-mono font-bold">↑↓</kbd> to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white border border-[#edece9] px-1 rounded shadow-sm font-mono font-bold">Enter</kbd> to select
                  </span>
                </div>
                <span>Total workspace pages: {pages.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
