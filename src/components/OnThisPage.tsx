"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HeadingItem {
  type: "heading2" | "heading3";
  content: string;
}

interface OnThisPageProps {
  headings: HeadingItem[];
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function OnThisPage({ headings }: OnThisPageProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const headingElements = headings.map((h) => 
      document.getElementById(slugify(h.content))
    ).filter(Boolean) as HTMLElement[];

    const handleScroll = () => {
      // Find the heading closest to the top of the viewport
      const scrollPosition = window.scrollY + 100; // Offset for header
      
      let currentActiveId = "";
      for (let i = 0; i < headingElements.length; i++) {
        const el = headingElements[i];
        if (el.offsetTop <= scrollPosition) {
          currentActiveId = el.id;
        } else {
          break;
        }
      }
      
      // Fallback to first heading if scrolled above all
      if (!currentActiveId && headingElements.length > 0) {
        currentActiveId = headingElements[0].id;
      }
      
      setActiveId(currentActiveId);
    };

    window.addEventListener("scroll", handleScroll);
    // Initial call
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="w-56 shrink-0 hidden lg:block sticky top-24 self-start pl-6 py-1 border-l border-[#e8e7e3]">
      <div className="text-[11px] font-bold text-[#787774] uppercase tracking-wider mb-4 flex items-center gap-1.5 select-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="21" y1="10" x2="7" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="21" y1="18" x2="7" y2="18" />
        </svg>
        On this page
      </div>
      <nav className="flex flex-col gap-2">
        {headings.map((h) => {
          const id = slugify(h.content);
          const active = activeId === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                "text-[13px] leading-relaxed transition-colors border-l-2 -ml-[25px] pl-6 block py-0.5",
                h.type === "heading3" ? "pl-9 -ml-[25px]" : "",
                active 
                  ? "text-[#1e1e1e] border-[#5c5bd4] font-medium" 
                  : "text-[#787774] border-transparent hover:text-[#1e1e1e]"
              )}
            >
              {h.content}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
