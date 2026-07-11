"use client";

import React, { useState, useEffect } from "react";
import { BlockRenderer } from "./BlockRenderer";
import { Block } from "@/lib/types";
import { DiffViewer, type BlockEdit } from "./DiffViewer";
import { X, ChevronLeft, Table, Info, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageBlocksContainerProps {
  initialBlocks: Block[];
  isMock: boolean;
  pageId: string;
}

export function PageBlocksContainer({ initialBlocks, isMock, pageId }: PageBlocksContainerProps) {
  const [pendingEdits, setPendingEdits] = useState<BlockEdit[] | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Side-Peek Drawer State
  const [peekPageId, setPeekPageId] = useState<string | null>(null);
  const [peekTitle, setPeekTitle] = useState<string>("");
  const [peekHistory, setPeekHistory] = useState<{ id: string; title: string }[]>([]);
  const [peekBlocks, setPeekBlocks] = useState<any[]>([]);
  const [peekLoading, setPeekLoading] = useState(false);
  const [peekError, setPeekError] = useState<string | null>(null);

  const [drawerWidth, setDrawerWidth] = useState(650);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= window.innerWidth * 0.95) {
        setDrawerWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Sync edits and applying status from the floating chat popup
  useEffect(() => {
    const handlePendingEdits = (event: Event) => {
      const customEvent = event as CustomEvent<{ edits: BlockEdit[] | null; pageId: string | null; messageId: string | null }>;
      if (customEvent.detail.pageId === pageId) {
        setPendingEdits(customEvent.detail.edits);
        setMessageId(customEvent.detail.messageId);
      } else {
        setPendingEdits(null);
        setMessageId(null);
      }
    };

    const handleApplyingState = (event: Event) => {
      const customEvent = event as CustomEvent<{ isApplying: boolean }>;
      setIsApplying(customEvent.detail.isApplying);
    };

    window.addEventListener("notion-ai:pending-edits", handlePendingEdits);
    window.addEventListener("notion-ai:applying-state", handleApplyingState);
    return () => {
      window.removeEventListener("notion-ai:pending-edits", handlePendingEdits);
      window.removeEventListener("notion-ai:applying-state", handleApplyingState);
    };
  }, [pageId]);

  // Listen to open peek drawer events
  useEffect(() => {
    const handleOpenPeek = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string; title: string }>;
      const { id, title } = customEvent.detail;
      if (!id) return;

      setPeekPageId((currentId) => {
        if (currentId) {
          if (currentId !== id) {
            setPeekHistory((prev) => {
              if (prev.some(h => h.id === currentId)) return prev;
              return [...prev, { id: currentId, title: peekTitle }];
            });
          }
        }
        return id;
      });
      setPeekTitle(title || "Untitled Page");
    };

    window.addEventListener("notion-ai:open-peek", handleOpenPeek);
    return () => {
      window.removeEventListener("notion-ai:open-peek", handleOpenPeek);
    };
  }, [peekTitle]);

  // Fetch page blocks when opening a row
  useEffect(() => {
    if (!peekPageId) {
      setPeekBlocks([]);
      return;
    }

    const fetchBlocks = async () => {
      setPeekLoading(true);
      setPeekError(null);
      try {
        const response = await fetch(`/api/blocks/${peekPageId}`);
        if (!response.ok) {
          throw new Error(`Failed to load page content: ${response.statusText}`);
        }
        const data = await response.json();
        setPeekBlocks(data.blocks || []);
      } catch (err: any) {
        console.error("Error fetching page blocks:", err);
        setPeekError(err.message || "Failed to load page content.");
      } finally {
        setPeekLoading(false);
      }
    };

    fetchBlocks();
  }, [peekPageId]);

  const handleGoBack = () => {
    if (peekHistory.length === 0) return;
    const newHistory = [...peekHistory];
    const prevPage = newHistory.pop()!;
    setPeekHistory(newHistory);
    setPeekPageId(prevPage.id);
    setPeekTitle(prevPage.title);
  };

  // Reset edits when initialBlocks change (meaning page was refetched / edits applied)
  useEffect(() => {
    setPendingEdits(null);
    setMessageId(null);
  }, [initialBlocks]);

  if (!initialBlocks || initialBlocks.length === 0) {
    return <div className="text-center py-12 text-sm text-[#7c7b77]">This page has no content.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Proposed Edits Diff Viewer Panel */}
      {pendingEdits && pendingEdits.length > 0 && (
        <div className="mb-6 p-5 bg-[#f7f7f5]/80 border border-[#edece9] rounded-2xl shadow-sm animate-scale-in">
          <div className="flex items-center gap-2 mb-3.5 select-none">
            <span className="text-sm font-extrabold text-[#1a1a1a]">Proposed Edits Preview</span>
            <span className="text-[10px] text-purple-700 font-bold px-1.5 py-0.5 bg-purple-50 rounded border border-purple-100 uppercase tracking-wider">
              Notion AI
            </span>
          </div>
          <DiffViewer
            edits={pendingEdits}
            onApply={() => {
              if (messageId) {
                window.dispatchEvent(new CustomEvent("notion-ai:action-apply", {
                  detail: { messageId, edits: pendingEdits }
                }));
              }
            }}
            onDiscard={() => {
              if (messageId) {
                window.dispatchEvent(new CustomEvent("notion-ai:action-discard", {
                  detail: { messageId }
                }));
              }
            }}
            isApplying={isApplying}
          />
        </div>
      )}

      {initialBlocks.map((block, idx) => {
        const matchingEdit = pendingEdits?.find((e) => e.block_id === block.id);
        const insertAfterEdits = pendingEdits?.filter(
          (e) => e.block_id === block.id && e.action === "insert_after"
        );

        return (
          <React.Fragment key={block.id || idx}>
            <BlockRenderer
              block={block}
              isMock={isMock}
              pendingEdit={matchingEdit}
              pendingEdits={pendingEdits || undefined}
            />

            {/* Render proposed inserted blocks right after this block */}
            {insertAfterEdits?.map((insertEdit, insIdx) => {
              // Convert insert instruction into a temporary Block object to render it
              const tempBlock: Block = {
                id: `temp-insert-${insIdx}`,
                type: insertEdit.block_type,
                content: insertEdit.new_content,
              };

              return (
                <div
                  key={tempBlock.id}
                  className="pl-4 border-l-4 border-green-500 bg-green-50/40 p-2 rounded-r-lg animate-scale-in"
                >
                  <div className="text-[10px] text-green-700 font-bold uppercase mb-1 flex items-center gap-1 select-none">
                    <span>+ Proposed addition ({insertEdit.block_type})</span>
                  </div>
                  <BlockRenderer block={tempBlock} isMock={isMock} />
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      {/* Slide-out Side-Peek Drawer Panel */}
      {peekPageId && (
        <div className={cn("fixed inset-0 z-50 overflow-hidden", isResizing ? "select-none" : "select-text")}>
          {/* Backdrop overlay (Transparent backdrop to capture outside clicks) */}
          <div 
            onClick={() => {
              setPeekPageId(null);
              setPeekHistory([]);
            }}
            className="absolute inset-0 bg-transparent"
          />

          {/* Drawer Panel */}
          <div 
            className="absolute top-0 right-0 bottom-0 bg-white border-l border-[#edece9] shadow-2xl flex flex-col h-full animate-slide-in-right"
            style={{
              width: `${drawerWidth}px`,
              maxWidth: "95vw",
              minWidth: "300px",
              animation: "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                "absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize hover:bg-[#2383e2]/40 transition-colors z-[60] bg-transparent",
                isResizing && "bg-[#2383e2] w-1.5"
              )}
            />

            {/* Drawer Header with breadcrumbs path */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#edece9] select-none flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-[#7a7a78] overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                <Table className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Database Entry</span>
                {peekHistory.map((hist, idx) => (
                  <React.Fragment key={hist.id}>
                    <span className="flex-shrink-0">/</span>
                    <button
                      onClick={() => {
                        const newHistory = peekHistory.slice(0, idx);
                        setPeekHistory(newHistory);
                        setPeekPageId(hist.id);
                        setPeekTitle(hist.title);
                      }}
                      className="hover:bg-[#edece9] px-1.5 py-0.5 rounded text-[#37352f] transition-all font-medium truncate max-w-[120px] cursor-pointer"
                    >
                      {hist.title}
                    </button>
                  </React.Fragment>
                ))}
                <span className="flex-shrink-0">/</span>
                <span className="font-semibold text-[#37352f] truncate max-w-[180px]">{peekTitle}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                {peekHistory.length > 0 && (
                  <button
                    onClick={handleGoBack}
                    className="p-1 hover:bg-[#edece9] rounded text-[#7a7a78] hover:text-[#37352f] transition-all focus:outline-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                    title="Go Back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setPeekPageId(null);
                    setPeekHistory([]);
                  }}
                  className="p-1 hover:bg-[#edece9] rounded text-[#7a7a78] hover:text-[#37352f] transition-all focus:outline-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body Scroll Container */}
            <div className="flex-1 overflow-y-auto px-10 py-8 select-text">
              {/* Page Title Header */}
              <div className="mb-6">
                <div className="text-4xl block mb-3 select-none">📄</div>
                <h1 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">{peekTitle}</h1>
              </div>

              {/* Page Properties */}
              <div className="mb-8 border border-[#edece9] rounded-xl p-4 bg-[#f7f7f5]/40 text-xs text-[#37352f]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a78] mb-3 select-none">Properties</div>
                <div className="grid grid-cols-[100px_1fr] gap-y-3.5 items-center">
                  <div className="text-[#7c7b77] select-none font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-neutral-400" /> Page ID
                  </div>
                  <div className="font-mono text-[11px] bg-[#edece9]/50 px-2 py-0.5 rounded border border-[#edece9] w-max select-all truncate max-w-full">
                    {peekPageId}
                  </div>
                </div>
              </div>

              {/* Page Blocks Content */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a78] mb-4 select-none">Content</div>

                {peekLoading && (
                  <div className="space-y-3.5 select-none mt-2">
                    <div className="h-4 bg-[#edece9] rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-[#edece9] rounded w-5/6 animate-pulse"></div>
                    <div className="h-4 bg-[#edece9] rounded w-2/3 animate-pulse"></div>
                    <div className="h-10 bg-[#edece9] rounded w-full animate-pulse mt-4"></div>
                    <div className="h-4 bg-[#edece9] rounded w-1/2 animate-pulse mt-4"></div>
                  </div>
                )}

                {peekError && (
                  <div className="text-sm text-red-600 border border-red-200 bg-red-50/50 rounded-xl p-4 mt-2">
                    <p className="font-semibold flex items-center gap-1"><Info className="w-4 h-4" /> Content Load Failed</p>
                    <p className="text-xs mt-1 text-red-500">{peekError}</p>
                  </div>
                )}

                {!peekLoading && !peekError && peekBlocks.length === 0 && (
                  <div className="text-center py-10 text-xs text-[#7c7b77] border border-dashed border-[#edece9] rounded-xl select-none">
                    <span>This page has no content blocks.</span>
                  </div>
                )}

                {!peekLoading && !peekError && peekBlocks.length > 0 && (
                  <div className="space-y-3">
                    {peekBlocks.map((block, index) => (
                      <BlockRenderer key={block.id || index} block={block} isMock={isMock} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS injection for drawer animations */}
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
