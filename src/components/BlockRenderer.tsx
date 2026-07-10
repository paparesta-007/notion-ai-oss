import React from "react";
import { CheckSquare, FileText, ExternalLink, FileCode, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block } from "@/lib/types";
import { Latex } from "./Latex";
import { CodeBlock } from "./CodeBlock";
import { InteractiveDatabase } from "./InteractiveDatabase";
import { InteractiveButton } from "./InteractiveButton";

export function PageIcon({ emoji, className = "w-4 h-4" }: { emoji?: string | null; className?: string }) {
  if (emoji && emoji.length > 0 && !["📄", "🔗", "📎"].includes(emoji)) {
    return <span className="text-base flex-shrink-0 leading-none">{emoji}</span>;
  }
  return <FileText className={cn(className, "text-[#7a7a78] flex-shrink-0")} />;
}

export function RichTextRenderer({ textArr }: { textArr?: any }) {
  if (!textArr) return null;
  
  if (typeof textArr === "string") {
    return <span className="whitespace-pre-wrap">{textArr}</span>;
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

        let element = <span key={idx}>{text?.content || t.plain_text || ""}</span>;

        if (annotations?.bold) element = <strong key={idx} className="font-bold text-[#1a1a1a]">{text?.content || t.plain_text}</strong>;
        if (annotations?.italic) element = <em key={idx} className="italic">{text?.content || t.plain_text}</em>;
        if (annotations?.underline) element = <u key={idx} className="underline">{text?.content || t.plain_text}</u>;
        if (annotations?.strikethrough) element = <span key={idx} className="line-through">{text?.content || t.plain_text}</span>;
        if (annotations?.code) element = <code key={idx} className="bg-[#edece9]/50 px-1 py-0.5 rounded font-mono text-xs">{text?.content || t.plain_text}</code>;

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

interface BlockRendererProps {
  block: Block;
  isMock: boolean;
}

export function BlockRenderer({ block, isMock }: BlockRendererProps) {
  const { type, content, checked, language } = block;

  switch (type) {
    case "heading_1":
      return (
        <h1 className="text-[28px] font-bold text-[#1a1a1a] mt-8 mb-3 tracking-tight leading-tight border-b border-[#f1f1ef] pb-2">
          {content}
        </h1>
      );
    case "heading_2":
      return (
        <h2 className="text-[22px] font-bold text-[#1a1a1a] mt-6 mb-2 tracking-tight leading-snug">
          {content}
        </h2>
      );
    case "heading_3":
      return (
        <h3 className="text-[18px] font-semibold text-[#1a1a1a] mt-5 mb-2 tracking-tight leading-snug">
          {content}
        </h3>
      );
    case "paragraph":
      return (
        <p className="text-base text-[#37352f] leading-relaxed mb-4 font-normal">
          {content}
        </p>
      );
    case "bulleted_list_item":
      return (
        <div className="flex items-start gap-2.5 text-base text-[#37352f] mb-2 pl-1.5">
          <span className="text-[#a4a3a1] select-none text-[16px] leading-none mt-1">•</span>
          <span className="leading-relaxed">{content}</span>
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
            {content}
          </span>
        </div>
      );
    case "code":
      return (
        <div className="mb-4 mt-2">
          <div className="flex justify-between items-center bg-[#edece9]/30 px-3 py-1.5 border-t border-l border-r border-[#edece9] rounded-t-md text-xs text-[#7a7a78] font-mono select-none">
            <span className="flex items-center gap-1"><FileCode className="w-4 h-4 text-[#7a7a78]" /> {language || "code"}</span>
            <span>Read-Only</span>
          </div>
          <CodeBlock code={content} language={language || "javascript"} />
        </div>
      );
    case "quote":
      return (
        <blockquote className="pl-4 border-l-4 border-[#37352f] text-base italic text-[#6a6965] my-4 leading-relaxed font-normal">
          {content}
        </blockquote>
      );
    case "callout":
      return (
        <div className="flex gap-3 p-4 bg-[#f7f7f5] border border-[#edece9] rounded-xl text-base text-[#37352f] my-4 leading-relaxed items-start">
          <Info className="w-5 h-5 text-[#7a7a78] mt-0.5 flex-shrink-0" />
          <div>{content}</div>
        </div>
      );
    case "table":
      const tableRows = block.rows || [];
      const hasColHeader = block.has_column_header;
      return (
        <div className="my-4 overflow-x-auto border border-[#edece9] rounded-lg select-text">
          <table className="min-w-full divide-y divide-[#edece9] border-collapse">
            <tbody className="divide-y divide-[#edece9]">
              {tableRows.map((row, rowIdx) => {
                const isHeader = rowIdx === 0 && hasColHeader;
                return (
                  <tr key={rowIdx} className={cn(isHeader ? "bg-[#f7f7f5]/60 font-semibold" : "hover:bg-[#f7f7f5]/20")}>
                    {row.map((cell, cellIdx) => {
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
    default:
      return null;
  }
}
