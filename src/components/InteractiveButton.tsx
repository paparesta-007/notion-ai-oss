"use client";

import React, { useState, useEffect } from "react";
import { Play, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveButtonProps {
  buttonText?: string;
  buttonIcon?: string;
}

export function InteractiveButton({ buttonText = "Run Action", buttonIcon = "⚡" }: InteractiveButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setShowToast(true);
    setTimeout(() => setIsClicked(false), 200);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="my-4 relative">
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e3e2e0] bg-white text-sm font-medium text-[#37352f] shadow-sm hover:bg-[#f7f7f5] hover:border-[#c3c2c0] transition-all cursor-pointer select-none active:scale-[0.97]",
          isClicked && "scale-[0.97] bg-[#edece9]"
        )}
      >
        <span className="text-base leading-none select-none">{buttonIcon}</span>
        <span>{buttonText}</span>
      </button>

      {/* Slide-in Toast Notification */}
      {showToast && (
        <div 
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] text-white rounded-xl shadow-2xl border border-neutral-800 animate-slide-in select-none max-w-sm"
          style={{
            animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
          </div>
          <div className="flex flex-col pr-2">
            <span className="text-xs font-semibold text-white leading-none">Button Action Triggered</span>
            <span className="text-[10px] text-neutral-400 mt-1">Successfully executed: "{buttonText}"</span>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="text-neutral-500 hover:text-neutral-300 text-xs font-bold leading-none p-1 ml-2 transition-colors focus:outline-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Global CSS injection for toast animation keyframes if not defined */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
