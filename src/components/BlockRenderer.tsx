"use client";

import React from "react";
import { CheckSquare, FileText, ExternalLink, FileCode, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Latex } from "./Latex";

const NOTION_TEXT_COLORS: Record<string, string> = {
  gray: "text-gray-500",
  brown: "text-[#976d57]",
  orange: "text-[#d9730d]",
  yellow: "text-[#dfab01]",
  green: "text-[#0f7b53] font-medium",
  blue: "text-[#0969da]",
  purple: "text-[#8250df]",
  pink: "text-[#bf3989]",
  red: "text-[#cf222e]",
  gray_background: "bg-[#f1f1ef] px-1 rounded",
  brown_background: "bg-[#f4eeee] px-1 rounded",
  orange_background: "bg-[#fbecdd] px-1 rounded",
  yellow_background: "bg-[#fbf3db] px-1 rounded",
  green_background: "bg-[#edf6f2] px-1 rounded text-[#0f7b53]",
  blue_background: "bg-[#eef6fc] px-1 rounded",
  purple_background: "bg-[#fbf4fc] px-1 rounded",
  pink_background: "bg-[#fdf4f7] px-1 rounded",
  red_background: "bg-[#fdf2f2] px-1 rounded",
};
import { Block } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";
import { InteractiveDatabase } from "./InteractiveDatabase";
import { InteractiveButton } from "./InteractiveButton";
import { diffWordsWithSpace } from "diff";
import { type BlockEdit } from "./DiffViewer";

export function PageIcon({ emoji, className = "w-4 h-4" }: { emoji?: string | null; className?: string }) {
  if (emoji && emoji.length > 0 && !["📄", "🔗", "📎"].includes(emoji)) {
    if (emoji.startsWith("http://") || emoji.startsWith("https://")) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={emoji}
          alt="icon"
          className={cn(className, "object-contain rounded flex-shrink-0")}
        />
      );
    }
    return <span className="text-base flex-shrink-0 leading-none">{emoji}</span>;
  }
  return <FileText className={cn(className, "text-[#7a7a78] flex-shrink-0")} />;
}

function parseBoldAndItalic(text: string, baseKey: any): React.ReactNode {
  // Split by bold: **text**
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <React.Fragment key={baseKey}>
      {boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          const boldText = bPart.slice(2, -2);
          return (
            <strong key={`bold-${bIdx}`} className="font-bold text-[#1a1a1a]">
              {boldText}
            </strong>
          );
        }

        // Split by italic: *text*
        const italicParts = bPart.split(/(\*[^*]+\*)/g);
        return (
          <React.Fragment key={`italic-frag-${bIdx}`}>
            {italicParts.map((iPart, iIdx) => {
              if (iPart.startsWith("*") && iPart.endsWith("*")) {
                const italicText = iPart.slice(1, -1);
                return (
                  <em key={`italic-${iIdx}`} className="italic">
                    {italicText}
                  </em>
                );
              }
              return iPart;
            })}
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split by inline code: `code`
  const parts = text.split(/(`[^`\n]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={`code-${index}`}
          className="bg-[#edece9]/60 px-1.5 py-0.5 rounded font-mono text-[13px] text-[#eb5757]"
        >
          {codeText}
        </code>
      );
    }

    return parseBoldAndItalic(part, index);
  });
}

export function parseAndRenderText(text: string) {
  if (!text) return "";
  
  // Split text by $$...$$ (block math) and $...$ (inline math)
  const parts = text.split(/(\$\$.*?\$)|\$.*?\$/g);
  
  // Clean empty values
  const cleanParts = parts.filter(Boolean);
  if (cleanParts.length === 0) return parseInlineMarkdown(text);
  
  // Regex parsing for inline math
  const inlineMathRegex = /(\$\$.*?\$\$|\$.*?\$)/g;
  const splitParts = text.split(inlineMathRegex);

  return splitParts.map((part, idx) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const math = part.slice(2, -2);
      return <Latex key={idx} math={math} block={true} />;
    } else if (part.startsWith("$") && part.endsWith("$")) {
      const math = part.slice(1, -1);
      return <Latex key={idx} math={math} block={false} />;
    }
    return <React.Fragment key={idx}>{parseInlineMarkdown(part)}</React.Fragment>;
  });
}

export function RichTextRenderer({ textArr }: { textArr?: any }) {
  if (!textArr) return null;
  
  if (typeof textArr === "string") {
    return <span className="whitespace-pre-wrap">{parseAndRenderText(textArr)}</span>;
  }
  
  if (!Array.isArray(textArr)) return null;

  return (
    <span className="whitespace-pre-wrap">
      {textArr.map((t, idx) => {
        const { annotations, text, href, type } = t;

        // Support inline math equations
        if (type === "equation" && t.equation?.expression) {
          return <Latex key={idx} math={t.equation.expression} block={false} />;
        }

        const textColorClass = annotations?.color && NOTION_TEXT_COLORS[annotations.color] ? NOTION_TEXT_COLORS[annotations.color] : "";
        const textContent = parseAndRenderText(text?.content || t.plain_text || "");

        let element = <span key={idx} className={textColorClass}>{textContent}</span>;

        if (annotations?.bold) element = <strong key={idx} className={cn("font-bold text-[#1a1a1a]", textColorClass)}>{textContent}</strong>;
        if (annotations?.italic) element = <em key={idx} className={cn("italic", textColorClass)}>{textContent}</em>;
        if (annotations?.underline) element = <u key={idx} className={cn("underline", textColorClass)}>{textContent}</u>;
        if (annotations?.strikethrough) element = <span key={idx} className={cn("line-through", textColorClass)}>{textContent}</span>;
        if (annotations?.code) element = <code key={idx} className={cn("bg-[#edece9]/50 px-1 py-0.5 rounded font-mono text-xs", textColorClass)}>{text?.content || t.plain_text}</code>;

        if (href) {
          element = (
            <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="text-[#2383e2] hover:underline">
              {element}
            </a>
          );
        }

        return element;
      })}
    </span>
  );
}

export function InlineDiff({ original, modified }: { original: string; modified: string }) {
  const diffs = diffWordsWithSpace(original, modified);

  return (
    <span className="whitespace-pre-wrap">
      {diffs.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 px-0.5 rounded font-semibold border-b border-green-300"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 line-through px-0.5 rounded border-b border-red-300"
            >
              {part.value}
            </span>
          );
        }
        return <span key={index} className="text-[#37352f]">{part.value}</span>;
      })}
    </span>
  );
}

function getHexColor(color: string): string {
  const map: Record<string, string> = {
    gray: "#787774",
    brown: "#976d57",
    orange: "#d9730d",
    yellow: "#dfab01",
    green: "#0f7b53",
    blue: "#0969da",
    purple: "#8250df",
    pink: "#bf3989",
    red: "#cf222e",
    gray_background: "#f1f1ef",
    brown_background: "#f4eeee",
    orange_background: "#fbecdd",
    yellow_background: "#fbf3db",
    green_background: "#edf6f2",
    blue_background: "#eef6fc",
    purple_background: "#fbf4fc",
    pink_background: "#fdf4f7",
    red_background: "#fdf2f2",
  };
  return map[color] || "";
}

function richTextToHtml(richText?: any[], blockContent?: string): string {
  if (!richText || richText.length === 0) {
    return blockContent || "";
  }
  
  return richText.map(t => {
    const { annotations, text, href } = t;
    let content = text?.content || t.plain_text || "";
    
    if (annotations?.bold) content = `<strong>${content}</strong>`;
    if (annotations?.italic) content = `<em>${content}</em>`;
    if (annotations?.underline) content = `<u>${content}</u>`;
    if (annotations?.strikethrough) content = `<span style="text-decoration: line-through;">${content}</span>`;
    if (annotations?.code) content = `<code class="bg-[#edece9]/50 px-1 py-0.5 rounded font-mono text-xs">${content}</code>`;
    if (annotations?.color && NOTION_TEXT_COLORS[annotations.color]) {
      const colorStyle = annotations.color.includes("background") 
        ? `background-color: ${getHexColor(annotations.color)}` 
        : `color: ${getHexColor(annotations.color)}`;
      content = `<span style="${colorStyle}">${content}</span>`;
    }
    
    if (href) {
      content = `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #2383e2; text-decoration: underline;">${content}</a>`;
    }
    
    return content;
  }).join("");
}

interface BlockRendererProps {
  block: Block;
  isMock: boolean;
  pendingEdit?: BlockEdit;
  pendingEdits?: BlockEdit[];
  onUpdate?: (newHtml: string) => void;
  isEditable?: boolean;
}

export function BlockRenderer({ block, isMock, pendingEdit, pendingEdits, onUpdate, isEditable = true }: BlockRendererProps) {
  const { type, content, checked, language } = block;

  const renderEditableWrapper = (tag: string, className: string, rawContent: string, richTextArray?: any[]) => {
    const Tag = tag as any;
    const initialHtml = richTextToHtml(richTextArray, rawContent);
    const ref = useRef<HTMLDivElement>(null);

    return (
      <Tag
        ref={ref}
        contentEditable={isEditable}
        suppressContentEditableWarning
        className={cn(
          "outline-none focus:bg-[#f7f7f5]/40 px-1 py-0.5 rounded cursor-text min-h-[1.5em] transition-all",
          className
        )}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onBlur={() => {
          if (ref.current && onUpdate) {
            onUpdate(ref.current.innerHTML);
          }
        }}
      />
    );
  };

  const renderInnerBlock = (blockType: string, blockContent: string, richText?: any[]) => {
    switch (blockType) {
      case "heading_1":
        return (
          <h1 className="text-[28px] font-bold text-[#1a1a1a] mt-8 mb-3 tracking-tight leading-tight border-b border-[#f1f1ef] pb-2">
            {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
          </h1>
        );
      case "heading_2":
        return (
          <h2 className="text-[22px] font-bold text-[#1a1a1a] mt-6 mb-2 tracking-tight leading-snug">
            {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
          </h2>
        );
      case "heading_3":
        return (
          <h3 className="text-[18px] font-semibold text-[#1a1a1a] mt-5 mb-2 tracking-tight leading-snug">
            {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
          </h3>
        );
      case "paragraph":
        return (
          <p className="text-base text-[#37352f] leading-relaxed mb-4 font-normal">
            {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
          </p>
        );
      case "bulleted_list_item":
        return (
          <div className="flex items-start gap-2.5 text-base text-[#37352f] mb-2 pl-1.5">
            <span className="text-[#a4a3a1] select-none text-[16px] leading-none mt-1">•</span>
            <span className="leading-relaxed">
              {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
            </span>
          </div>
        );
      case "to_do":
        return (
          <div className="flex items-start gap-2.5 text-base text-[#37352f] mb-2 pl-0.5">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mt-1 h-4 w-4 rounded border-[#e3e2e0] text-[#2383e2] focus:ring-[#2383e2] cursor-not-allowed"
            />
            <span className={`leading-relaxed ${checked ? "line-through text-[#7c7b77]" : ""}`}>
              {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
            </span>
          </div>
        );
      case "quote":
        return (
          <blockquote className="pl-4 border-l-4 border-[#37352f] text-base italic text-[#6a6965] my-4 leading-relaxed font-normal">
            {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
          </blockquote>
        );
      case "callout":
        return (
          <div className="flex gap-3 p-4 bg-[#f7f7f5] border border-[#edece9] rounded-xl text-base text-[#37352f] my-4 leading-relaxed items-start">
            <Info className="w-5 h-5 text-[#7a7a78] mt-0.5 flex-shrink-0" />
            <div>
              {richText ? <RichTextRenderer textArr={richText} /> : parseAndRenderText(blockContent)}
            </div>
          </div>
        );
      case "code":
        return (
          <div className="mb-4 mt-2">
            <div className="flex justify-between items-center bg-[#edece9]/30 px-3 py-1.5 border-t border-l border-r border-[#edece9] rounded-t-md text-xs text-[#7a7a78] font-mono select-none">
              <span className="flex items-center gap-1"><FileCode className="w-4 h-4 text-[#7a7a78]" /> {language || "code"}</span>
              <span>Read-Only</span>
            </div>
            <CodeBlock code={blockContent} language={language || "javascript"} />
          </div>
        );
      default:
        return null;
    }
  };

  // Special block rendering layout (non-standard text elements)
  const renderSpecialBlock = () => {
    switch (type) {
      case "table":
        const tableRows = block.rows || [];
        const hasColHeader = block.has_column_header;
        return (
          <div className="my-4 overflow-x-auto border border-[#edece9] rounded-lg select-text bg-white">
            <table className="min-w-full divide-y divide-[#edece9] border-collapse">
              <tbody className="divide-y divide-[#edece9]">
                {tableRows.map((rowItem: any, rowIdx: number) => {
                  const rowId = rowItem && typeof rowItem === "object" && "id" in rowItem ? rowItem.id : null;
                  const cells = rowItem && typeof rowItem === "object" && "cells" in rowItem ? rowItem.cells : (Array.isArray(rowItem) ? rowItem : []);
                  const isHeader = rowIdx === 0 && hasColHeader;
                  
                  // Check if this row has pending edits
                  const rowEdit = rowId ? pendingEdits?.find((e) => e.block_id === rowId) : null;
                  
                  if (rowEdit && rowEdit.action === "delete") {
                    return (
                      <tr key={rowIdx} className="bg-red-50/70 hover:bg-red-100/50 transition-colors line-through text-red-800">
                        {cells.map((cell: any, cellIdx: number) => (
                          <td key={cellIdx} className="px-4 py-2.5 text-sm text-left border border-red-200 min-w-[120px]">
                            <RichTextRenderer textArr={cell} />
                          </td>
                        ))}
                      </tr>
                    );
                  }

                  if (rowEdit && rowEdit.action === "update") {
                    const newCellsText = rowEdit.new_content.split(" | ");
                    return (
                      <tr key={rowIdx} className="bg-amber-50/40 hover:bg-amber-50 transition-colors border-l-4 border-amber-500">
                        {cells.map((cell: any, cellIdx: number) => {
                          const originalText = cell && Array.isArray(cell) 
                            ? cell.map((t: any) => t.plain_text).join("") 
                            : (typeof cell === "string" ? cell : "");
                          const modifiedText = newCellsText[cellIdx] || "";
                          
                          return (
                            <td key={cellIdx} className="px-4 py-2.5 text-sm text-left border border-amber-200 min-w-[120px]">
                              {originalText !== modifiedText ? (
                                <InlineDiff original={originalText} modified={modifiedText} />
                              ) : (
                                <RichTextRenderer textArr={cell} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }

                  return (
                    <tr key={rowIdx} className={cn(isHeader ? "bg-[#f7f7f5]/60 font-semibold" : "hover:bg-[#f7f7f5]/20")}>
                      {cells.map((cell: any, cellIdx: number) => {
                        const CellTag = isHeader ? "th" : "td";
                        return (
                          <CellTag key={cellIdx} className="px-4 py-2.5 text-sm text-left border border-[#edece9] text-[#37352f] min-w-[120px]">
                            <RichTextRenderer textArr={cell} />
                          </CellTag>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      case "child_database":
        return (
          <InteractiveDatabase 
            databaseTitle={block.database_title || content} 
            initialRows={isMock ? (block.database_rows || undefined) : (block.database_rows || [])} 
            columns={isMock ? (block.database_columns || undefined) : (block.database_columns || [])} 
          />
        );
      case "button":
        return (
          <InteractiveButton 
            buttonText={block.button_text || content} 
            buttonIcon={block.button_icon} 
          />
        );
      case "equation":
        return (
          <div className="my-6 flex justify-center text-neutral-800">
            <Latex math={content} block={true} />
          </div>
        );
      case "pdf":
        return (
          <div className="my-4">
            <iframe src={content} className="w-full h-[600px] border border-[#edece9] rounded-xl shadow-sm" />
            {block.caption && <p className="text-xs text-[#7c7b77] mt-1.5 px-1 leading-normal select-none">{block.caption}</p>}
          </div>
        );
      case "embed":
        return (
          <div className="my-4">
            <div className="relative w-full h-[450px] border border-[#edece9] rounded-xl overflow-hidden shadow-sm bg-neutral-50 flex flex-col">
              <iframe src={content} className="w-full flex-1 border-none" />
              <div className="px-4 py-2 bg-white border-t border-[#edece9] flex items-center justify-between text-xs text-[#7c7b77] select-none">
                <span className="truncate">Embed source: {content}</span>
                <a href={content} target="_blank" rel="noopener noreferrer" className="text-[#2383e2] hover:underline font-semibold flex items-center gap-1">Open Link <ExternalLink className="w-3 h-3" /></a>
              </div>
            </div>
            {block.caption && <p className="text-xs text-[#7c7b77] mt-1.5 px-1 leading-normal select-none">{block.caption}</p>}
          </div>
        );
      case "image":
        return (
          <div className="my-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content}
              alt={block.caption || "Notion Image"}
              className="rounded-xl border border-[#edece9] max-h-[450px] object-cover w-full shadow-sm hover:shadow-md transition-shadow select-none"
            />
            {block.caption && (
              <p className="text-xs text-[#7c7b77] mt-1.5 px-1 leading-normal select-none">
                {block.caption}
              </p>
            )}
          </div>
        );
      case "video":
        const isYouTube = content.includes("youtube.com") || content.includes("youtu.be");
        let embedUrl = "";
        if (isYouTube) {
          const match = content.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
          if (match && match[1]) {
            embedUrl = `https://www.youtube.com/embed/${match[1]}`;
          }
        }
        return (
          <div className="my-4">
            {embedUrl ? (
              <div className="relative aspect-video rounded-xl border border-[#edece9] overflow-hidden shadow-sm">
                <iframe
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-none"
                />
              </div>
            ) : (
              <video
                src={content}
                controls
                className="rounded-xl border border-[#edece9] max-h-[450px] w-full shadow-sm select-none"
              />
            )}
            {block.caption && (
              <p className="text-xs text-[#7c7b77] mt-1.5 px-1 leading-normal select-none">
                {block.caption}
              </p>
            )}
          </div>
        );
      case "divider":
        return <hr className="border-t border-[#edece9] my-5" />;
      case "toggle":
        return (
          <details className="my-2 group">
            <summary className="cursor-pointer text-base text-[#37352f] select-none hover:bg-neutral-50 px-2 py-1.5 rounded-lg leading-relaxed font-medium flex items-center gap-2">
              <span className="text-neutral-400 group-open:rotate-90 transition-transform duration-100 select-none">▶</span>
              {parseAndRenderText(content)}
            </summary>
            <div className="pl-6 text-[#37352f] text-sm italic py-2 border-l-2 border-[#edece9] ml-4 mt-1 bg-neutral-50/20 rounded-r-md">
              (Toggle contents can be configured via page editing)
            </div>
          </details>
        );
      case "bookmark":
        return (
          <a
            href={content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 border border-[#edece9] rounded-xl hover:bg-[#f7f7f5]/30 transition-all my-4 text-[#37352f] shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-sm"
          >
            <div className="text-2xl p-2 bg-[#f7f7f5] rounded-lg">🔖</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-[#1e1e1e]">Bookmark Link</div>
              <div className="text-xs text-neutral-400 truncate mt-0.5">{content}</div>
              {block.caption && <div className="text-xs text-[#7c7b77] mt-1 italic">{block.caption}</div>}
            </div>
            <span className="text-neutral-300 text-sm">↗</span>
          </a>
        );
      case "file":
        const fileName = content.split("/").pop()?.split("?")[0] || "Attached File";
        return (
          <div className="flex items-center justify-between p-3.5 border border-[#edece9] rounded-xl bg-[#f7f7f5]/20 hover:bg-[#f7f7f5]/40 transition-colors my-3">
            <div className="flex items-center gap-3 text-sm text-[#37352f] min-w-0">
              <span className="text-xl">📁</span>
              <span className="font-semibold truncate text-[#1e1e1e]">{decodeURIComponent(fileName)}</span>
            </div>
            <div className="flex items-center gap-3">
              {block.caption && <span className="text-xs text-neutral-400 truncate max-w-[150px] italic">{block.caption}</span>}
              <a
                href={content}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#2383e2] hover:text-[#1c66b2] hover:underline font-bold px-3 py-1.5 bg-[#edece9]/40 hover:bg-[#edece9]/70 rounded-lg transition-colors flex-shrink-0"
              >
                Download
              </a>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render routine
  const isSpecial = [
    "table",
    "child_database",
    "button",
    "equation",
    "pdf",
    "embed",
    "image",
    "video",
    "divider",
    "toggle",
    "bookmark",
    "file"
  ].includes(type);

  if (pendingEdit) {
    if (pendingEdit.action === "delete") {
      return (
        <div className="border-l-4 border-red-500 bg-red-50/20 p-4 rounded-r-xl line-through text-red-800/60 relative animate-scale-in my-3 select-none">
          <div className="text-[10px] font-bold text-red-600 uppercase mb-2 select-none flex items-center gap-1.5">
            <span>− Proposed deletion (Original Version)</span>
          </div>
          <div>
            {isSpecial ? renderSpecialBlock() : renderInnerBlock(type, content, block.rich_text)}
          </div>
        </div>
      );
    }
    
    if (pendingEdit.action === "update") {
      return (
        <div className="space-y-3 my-4 animate-scale-in">
          {/* 1. Render Old Original Version (Red, line-through, slightly transparent) */}
          <div className="border-l-4 border-red-400 bg-red-50/15 p-4 rounded-r-xl line-through text-red-800/65 opacity-70 select-none">
            <div className="text-[10px] font-bold text-red-500 uppercase mb-2 flex items-center gap-1.5">
              <span>− Original Version (To be replaced)</span>
            </div>
            <div>
              {isSpecial ? renderSpecialBlock() : renderInnerBlock(type, content, block.rich_text)}
            </div>
          </div>

          {/* 2. Render New Proposed Version (Green, beautifully formatted, original type styles preserved) */}
          <div className="border-l-4 border-green-500 bg-green-50/20 p-4 rounded-r-xl text-green-950 font-normal">
            <div className="text-[10px] font-bold text-green-700 uppercase mb-2 flex items-center gap-1.5 select-none">
              <span>+ Proposed Version (New changes)</span>
            </div>
            <div>
              {isSpecial ? renderSpecialBlock() : renderInnerBlock(type, pendingEdit.new_content)}
            </div>
          </div>
        </div>
      );
    }
  }

  // Render normal blocks
  return isSpecial ? renderSpecialBlock() : renderInnerBlock(type, content, block.rich_text);
}
