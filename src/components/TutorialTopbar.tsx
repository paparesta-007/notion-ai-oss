"use client";

import Link from "next/link";
import { Search, Sparkles, Sun, ChevronRight } from "lucide-react";

export function TutorialTopbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e8e7e3] h-14 flex items-center justify-between px-5 select-none">
      {/* Left side: Logo and Navigation Links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#1e1e1e] flex items-center justify-center text-white text-[13px] font-extrabold font-serif">
            N
          </div>
          <span className="text-[14px] font-semibold text-[#1e1e1e] tracking-tight">
            Developer Docs
          </span>
        </Link>
        
        {/* Navigation items from image */}
        <nav className="hidden xl:flex items-center gap-4 text-[13px] text-[#787774]">
          <Link href="/tutorial" className="text-[#1e1e1e] font-semibold border-b-2 border-[#1e1e1e] py-4 translate-y-[2px]">
            Guides
          </Link>
          <a href="#" className="hover:text-[#1e1e1e] transition-colors py-4">API Reference</a>
          <a href="#" className="hover:text-[#1e1e1e] transition-colors py-4">CLI Reference</a>
          <a href="#" className="hover:text-[#1e1e1e] transition-colors py-4">Workers</a>
          <a href="#" className="hover:text-[#1e1e1e] transition-colors py-4">Admin API</a>
          <a href="#" className="hover:text-[#1e1e1e] transition-colors py-4">Changelog</a>
          <a href="#" className="hover:text-[#1e1e1e] transition-colors py-4">Examples</a>
        </nav>
      </div>

      {/* Right side: Search, Ask Assistant, Login, Portal */}
      <div className="flex items-center gap-3">
        {/* Search Input Box */}
        <div className="relative hidden md:block">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#a4a3a1]">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search..."
            className="w-48 pl-9 pr-12 py-1.5 bg-[#f7f6f3] border border-[#e8e7e3] rounded-md text-xs text-[#1e1e1e] placeholder-[#a4a3a1] focus:outline-none focus:border-[#5c5bd4] transition-colors"
            readOnly
          />
          <span className="absolute inset-y-0 right-3 flex items-center text-[10px] text-[#a4a3a1] font-mono select-none">
            Ctrl K
          </span>
        </div>

        {/* Ask Assistant button with Sparkle */}
        <button className="hidden sm:flex items-center gap-1 bg-white border border-[#e8e7e3] hover:bg-[#f7f6f3] text-[12px] font-semibold text-[#37352f] px-2.5 py-1.5 rounded-md transition-colors shadow-sm">
          <Sparkles size={12} className="text-[#5c5bd4] fill-[#5c5bd4]/10" />
          Ask Assistant
        </button>

        <div className="h-4 w-[1px] bg-[#e8e7e3] hidden sm:block" />

        {/* Login & Portal Action buttons */}
        <Link href="/login" className="text-[13px] text-[#787774] hover:text-[#1e1e1e] font-medium px-2 py-1.5 transition-colors">
          Log in
        </Link>

        <Link
          href="/login"
          className="bg-[#2383e2] hover:bg-[#1f75cb] text-white text-[12px] font-semibold px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors shadow-sm active:scale-[0.98]"
        >
          Developer portal <ChevronRight size={13} strokeWidth={2.5} />
        </Link>

        {/* Settings / Sun icon */}
        <button className="p-1.5 text-[#787774] hover:text-[#1e1e1e] rounded-md hover:bg-[#f7f6f3] transition-colors">
          <Sun size={15} />
        </button>
      </div>
    </header>
  );
}
