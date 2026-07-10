"use client";

import React, { useState, useEffect } from "react";
import { BlockRenderer } from "./BlockRenderer";
import { Block } from "@/lib/types";
import { type BlockEdit } from "./DiffViewer";

interface PageBlocksContainerProps {
  initialBlocks: Block[];
  isMock: boolean;
  pageId: string;
}

export function PageBlocksContainer({ initialBlocks, isMock, pageId }: PageBlocksContainerProps) {
  const [pendingEdits, setPendingEdits] = useState<BlockEdit[] | null>(null);

  // Sync edits from the floating chat popup
  useEffect(() => {
    const handlePendingEdits = (event: Event) => {
      const customEvent = event as CustomEvent<{ edits: BlockEdit[] | null; pageId: string | null }>;
      if (customEvent.detail.pageId === pageId) {
        setPendingEdits(customEvent.detail.edits);
      } else {
        setPendingEdits(null);
      }
    };

    window.addEventListener("notion-ai:pending-edits", handlePendingEdits);
    return () => {
      window.removeEventListener("notion-ai:pending-edits", handlePendingEdits);
    };
  }, [pageId]);

  // Reset edits when initialBlocks change (meaning page was refetched / edits applied)
  useEffect(() => {
    setPendingEdits(null);
  }, [initialBlocks]);

  if (!initialBlocks || initialBlocks.length === 0) {
    return <div className="text-center py-12 text-sm text-[#7c7b77]">This page has no content.</div>;
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
}
