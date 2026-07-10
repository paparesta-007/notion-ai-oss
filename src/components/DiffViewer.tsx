"use client";

import React from "react";
import { diffWordsWithSpace } from "diff";
import { cn } from "@/lib/utils";
import { Check, X, RotateCcw } from "lucide-react";

export interface BlockEdit {
  block_id: string;
  block_type: string;
  original_content: string;
  new_content: string;
  action: "update" | "delete" | "insert_after";
}

interface DiffViewerProps {
  edits: BlockEdit[];
  onApply: () => void;
  onDiscard: () => void;
  isApplying?: boolean;
}

function InlineDiff({ original, modified }: { original: string; modified: string }) {
  const diffs = diffWordsWithSpace(original, modified);

  return (
    <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
      {diffs.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 px-0.5 rounded"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 line-through px-0.5 rounded"
            >
              {part.value}
            </span>
          );
        }
        return (
          <span key={index} className="text-[#37352f]">
            {part.value}
          </span>
        );
      })}
    </div>
  );
}

export function DiffViewer({ edits, onApply, onDiscard, isApplying }: DiffViewerProps) {
  if (!edits || edits.length === 0) return null;

  return (
    <div className="space-y-3 select-none">
      {/* Diff Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-purple-100 text-purple-700 flex items-center justify-center">
            <RotateCcw className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold text-[#37352f]">
            {edits.length} block{edits.length !== 1 ? "s" : ""} modified
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-green-700 font-semibold">+{edits.filter(e => e.action !== "delete").length} changed</span>
          {edits.some(e => e.action === "delete") && (
            <span className="text-[10px] text-red-600 font-semibold">−{edits.filter(e => e.action === "delete").length} removed</span>
          )}
        </div>
      </div>

      {/* Diff Blocks */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {edits.map((edit, idx) => (
          <div
            key={edit.block_id + idx}
            className="border border-[#edece9] rounded-lg overflow-hidden bg-white shadow-sm"
          >
            {/* Block type badge */}
            <div className="px-2.5 py-1.5 bg-[#f7f7f5] border-b border-[#edece9] flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold text-[#7c7b77] uppercase tracking-wider">
                {edit.block_type.replace(/_/g, " ")}
              </span>
              <span className={cn(
                "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                edit.action === "update" && "bg-amber-50 text-amber-700",
                edit.action === "delete" && "bg-red-50 text-red-600",
                edit.action === "insert_after" && "bg-green-50 text-green-700",
              )}>
                {edit.action}
              </span>
            </div>
            {/* Inline diff content */}
            <div className="p-2.5">
              {edit.action === "delete" ? (
                <div className="font-mono text-xs text-red-700 bg-red-50 p-2 rounded line-through">
                  {edit.original_content}
                </div>
              ) : (
                <InlineDiff
                  original={edit.original_content}
                  modified={edit.new_content}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onApply}
          disabled={isApplying}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm border",
            isApplying
              ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
              : "bg-[#37352f] text-white border-neutral-800 hover:bg-neutral-800"
          )}
        >
          <Check className="w-3.5 h-3.5" />
          {isApplying ? "Applying..." : "Apply Changes"}
        </button>
        <button
          onClick={onDiscard}
          disabled={isApplying}
          className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold text-[#7c7b77] hover:text-red-600 bg-white hover:bg-red-50 border border-[#edece9] transition-all cursor-pointer shadow-sm"
        >
          <X className="w-3.5 h-3.5" />
          Discard
        </button>
      </div>
    </div>
  );
}
