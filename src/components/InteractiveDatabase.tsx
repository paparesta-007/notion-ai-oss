"use client";

import React, { useState, useEffect } from "react";
import { Table, Plus, Search, Calendar, Tag, ChevronDown, Filter, X, ExternalLink, Info, FileCode, CornerDownLeft, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageIcon } from "./BlockRenderer";
import { Latex } from "./Latex";
import { CodeBlock } from "./CodeBlock";

interface DatabaseRow extends Record<string, string> {
  id: string;
}

interface InteractiveDatabaseProps {
  databaseTitle?: string;
  initialRows?: Record<string, string>[];
  columns?: string[];
}

const DEFAULT_COLUMNS = ["Name", "Status", "Created Date", "Priority"];
const DEFAULT_ROWS: Record<string, string>[] = [
  {
    "Name": "Scuola 2024/25 syllabus review",
    "Status": "Done",
    "Created Date": "10/9/2024",
    "Priority": "High",
  },
  {
    "Name": "Progetto maturità initial sketch",
    "Status": "In Progress",
    "Created Date": "2/6/2026",
    "Priority": "Medium",
  },
  {
    "Name": "Redux architecture pattern notes",
    "Status": "Todo",
    "Created Date": "2/10/2026",
    "Priority": "Low",
  },
];

const STATUS_COLORS: Record<string, string> = {
  "Done": "bg-[#e2f5ec] text-[#0d7a56] border-[#0d7a56]/10",
  "In Progress": "bg-[#e8f2fc] text-[#0b6bcb] border-[#0b6bcb]/10",
  "Todo": "bg-[#f5f5f5] text-[#555555] border-[#555555]/10",
  "Draft": "bg-[#fef3c7] text-[#92400e] border-[#92400e]/10",
};

const PRIORITY_COLORS: Record<string, string> = {
  "High": "bg-red-50 text-red-700 border-red-200/50",
  "Medium": "bg-amber-50 text-amber-700 border-amber-200/50",
  "Low": "bg-slate-50 text-slate-700 border-slate-200/50",
};

const NOTION_TAG_COLORS: Record<string, string> = {
  default: "bg-[#f1f1ef] text-[#37352f] border-[#edece9]/50",
  gray: "bg-[#e3e2e0]/30 text-[#5a5a57] border-[#e3e2e0]/20",
  brown: "bg-[#eeeeeb] text-[#603b2c] border-[#ebdcd6]/50",
  orange: "bg-[#faebdd] text-[#854c1d] border-[#f5d9be]/50",
  yellow: "bg-[#fbf3db] text-[#89632a] border-[#f6e5b5]/50",
  green: "bg-[#ddf3e4] text-[#1c6b44] border-[#c0e6cc]/50",
  blue: "bg-[#ddedf4] text-[#1d5b85] border-[#c0dbec]/50",
  purple: "bg-[#eae4f2] text-[#523d85] border-[#d8cce6]/50",
  pink: "bg-[#fbe4e4] text-[#853d6d] border-[#f6ccd7]/50",
  red: "bg-[#fdebec] text-[#853d3d] border-[#f6c0c0]/50",
};

function parseAndRenderText(text: string) {
  if (!text) return "";
  
  // Split text by $$...$$ (block math) and $...$ (inline math)
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g);
  
  return parts.map((part, idx) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const math = part.slice(2, -2);
      return <Latex key={idx} math={math} block={true} />;
    } else if (part.startsWith("$") && part.endsWith("$")) {
      const math = part.slice(1, -1);
      return <Latex key={idx} math={math} block={false} />;
    }
    return <span key={idx}>{part}</span>;
  });
}

/* Client-side Rich Text Renderer (supports inline equations) */
function ClientRichTextRenderer({ textArr }: { textArr?: any }) {
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

        let element = <span key={idx}>{parseAndRenderText(text?.content || t.plain_text || "")}</span>;

        if (annotations?.bold) element = <strong key={idx} className="font-bold text-[#1a1a1a]">{parseAndRenderText(text?.content || t.plain_text || "")}</strong>;
        if (annotations?.italic) element = <em key={idx} className="italic">{parseAndRenderText(text?.content || t.plain_text || "")}</em>;
        if (annotations?.underline) element = <u key={idx} className="underline">{parseAndRenderText(text?.content || t.plain_text || "")}</u>;
        if (annotations?.strikethrough) element = <span key={idx} className="line-through">{parseAndRenderText(text?.content || t.plain_text || "")}</span>;
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



export function InteractiveDatabase({ 
  databaseTitle = "Untitled Database", 
  initialRows = DEFAULT_ROWS, 
  columns = DEFAULT_COLUMNS 
}: InteractiveDatabaseProps) {
  
  // Format initial rows with a unique ID if not present
  const formattedInitialRows = initialRows.map((row, idx) => ({
    ...row,
    id: row.id || `row-${idx}`,
  }));

  const [rows, setRows] = useState<DatabaseRow[]>(formattedInitialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  
  // Get unique statuses for the filter dropdown
  const uniqueStatuses = ["All", ...Array.from(new Set(rows.map(r => r["Status"] || r["status"] || "").filter(Boolean)))];

  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    const newRow: DatabaseRow = { id: newId };
    
    // Populate column values
    columns.forEach((col) => {
      if (col === "Name" || col === "title" || col === "titleProp" || col === "Subject") {
        newRow[col] = `New Workspace Item #${rows.length + 1}`;
      } else if (col === "Status" || col === "status") {
        newRow[col] = "Todo";
      } else if (col === "Created Date" || col === "created" || col === "date") {
        newRow[col] = new Date().toLocaleDateString();
      } else if (col === "Priority" || col === "priority") {
        newRow[col] = "Medium";
      } else {
        newRow[col] = "-";
      }
    });

    setRows((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Filter and search items
  const filteredRows = rows.filter((row) => {
    const primaryCol = columns[0];
    const matchSearch = row[primaryCol]?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const statusCol = columns.find(c => c.toLowerCase() === "status") || "Status";
    const matchStatus = statusFilter === "All" || row[statusCol] === statusFilter;

    return matchSearch && matchStatus;
  });
  const getColIcon = (colName: string) => {
    const nameLower = colName.toLowerCase();
    if (nameLower.includes("name") || nameLower.includes("title") || nameLower.includes("subject")) {
      return <span className="font-mono text-xs font-bold text-neutral-400 select-none mr-0.5">Aa</span>;
    }
    if (nameLower.includes("status")) {
      return (
        <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5z"/>
        </svg>
      );
    }
    if (nameLower.includes("date") || nameLower.includes("created")) {
      return <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />;
    }
    // Default list icon for text properties like Pagina, Cosa
    return (
      <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="3" y1="5" x2="13" y2="5" />
        <line x1="3" y1="8" x2="13" y2="8" />
        <line x1="3" y1="11" x2="13" y2="11" />
      </svg>
    );
  };

  const handleOpenRow = (row: DatabaseRow) => {
    const primaryCol = columns[0];
    const title = row[primaryCol] || "Untitled Entry";
    window.dispatchEvent(new CustomEvent("notion-ai:open-peek", {
      detail: { id: row.id, title }
    }));
  };

  return (
    <div className="my-6 select-text relative">
      {/* Database Controls Header */}
      <div className="px-4 py-3 bg-[#f7f7f5]/40 border-b border-[#edece9] flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[#37352f]" />
          <span className="font-bold text-sm text-[#1a1a1a]">{databaseTitle}</span>
          <span className="text-[10px] bg-[#edece9] text-[#7a7a78] px-1.5 py-0.5 rounded font-mono">
            {filteredRows.length} items
          </span>
        </div>

        {/* Filter and Search actions */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 h-7 text-xs bg-white border border-[#edece9] rounded-md outline-none focus:border-[#c3c2c0] transition-colors w-40"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative flex items-center bg-white border border-[#edece9] rounded-md h-7 px-2 hover:bg-[#f7f7f5] transition-colors">
            <Filter className="w-3 h-3 text-neutral-400 mr-1.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-[#37352f] cursor-pointer pr-1"
            >
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </div>

          {/* Add Item Button */}
          <button
            onClick={handleAddRow}
            className="h-7 inline-flex items-center gap-1 px-2.5 bg-[#2383e2] text-white hover:bg-[#1a6ebd] text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer select-none"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>
      </div>

      {/* Database Grid Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#edece9]">
          {/* Table Columns */}
          <thead className="bg-white select-none">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col}
                  scope="col"
                  className={cn(
                    "px-3 py-2 text-left text-xs font-medium text-[#7c7b77] border-b border-[#edece9] select-none",
                    idx < columns.length - 1 && "border-r border-[#edece9]"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {getColIcon(col)}
                    <span>{col}</span>
                  </div>
                </th>
              ))}
              <th scope="col" className="relative px-3 py-2 w-10 border-b border-[#edece9]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          {/* Table Data */}
          <tbody className="bg-white divide-y divide-[#edece9]">
            {filteredRows.length > 0 ? (
              <>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f7f7f5]/20 group transition-colors">
                    {columns.map((col, index) => {
                      const value = row[col] || "";
                      const isName = index === 0;
                      
                      let renderedValue = <span className="text-[#37352f] whitespace-normal break-words font-medium">{value}</span>;

                      if (value && value.startsWith('{"type":')) {
                        try {
                          const parsed = JSON.parse(value);
                          if (parsed.type === "multi_select" && parsed.tags) {
                            renderedValue = (
                              <div className="flex flex-wrap gap-1">
                                {parsed.tags.map((tag: any) => (
                                  <span 
                                    key={tag.name} 
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                      NOTION_TAG_COLORS[tag.color] || NOTION_TAG_COLORS.default
                                    )}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            );
                          } else if (parsed.type === "select" && parsed.tag) {
                            renderedValue = (
                              <span 
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                  NOTION_TAG_COLORS[parsed.tag.color] || NOTION_TAG_COLORS.default
                                )}
                              >
                                {parsed.tag.name}
                              </span>
                            );
                          }
                        } catch (e) {
                          // Keep string on parse error
                        }
                      } else if (isName) {
                        renderedValue = (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <PageIcon emoji={row._icon} className="w-4 h-4" />
                              <button
                                onClick={() => handleOpenRow(row)}
                                className="font-semibold text-[#37352f] hover:text-[#2383e2] hover:underline text-left truncate cursor-pointer"
                              >
                                {value}
                              </button>
                              {row._comments && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-neutral-400 font-semibold font-sans ml-1">
                                  💬{row._comments}
                                </span>
                              )}
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRow(row);
                              }}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white hover:bg-[#edece9] text-[10px] text-[#37352f] rounded border border-[#e3e2e0] shadow-sm transition-all font-semibold cursor-pointer select-none flex-shrink-0"
                            >
                              Open
                            </button>
                          </div>
                        );
                      } else if (col.toLowerCase() === "status") {
                        const statusVal = value.toLowerCase();
                        const color = statusVal.includes("done") || statusVal.includes("finito") 
                          ? "green" 
                          : (statusVal.includes("progress") || statusVal.includes("working") ? "blue" : "gray");
                        const colorClass = getNotionColorClasses(color);
                        renderedValue = (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1",
                            colorClass
                          )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {value}
                          </span>
                        );
                      } else if (col.toLowerCase() === "priority") {
                        renderedValue = (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold border",
                            PRIORITY_COLORS[value] || "bg-neutral-50 text-neutral-600 border-neutral-200/50"
                          )}>
                            {value}
                          </span>
                        );
                      }

                      return (
                        <td 
                          key={col} 
                          className={cn(
                            "px-3 py-2 text-xs",
                            index < columns.length - 1 && "border-r border-[#edece9]"
                          )}
                        >
                          {renderedValue}
                        </td>
                      );
                    })}
                    
                    {/* Delete actions */}
                    <td className="px-3 py-2 text-right w-10 select-none">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs font-semibold transition-opacity px-1.5 py-0.5 hover:bg-red-50 rounded select-none cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Bottom "+ New page" Notion-style trigger row */}
                <tr 
                  onClick={handleAddRow}
                  className="hover:bg-[#f7f7f5]/30 cursor-pointer text-[#7c7b77] transition-colors border-t border-[#edece9]"
                >
                  <td 
                    colSpan={columns.length + 1} 
                    className="px-3 py-2 text-xs font-medium text-left flex items-center gap-1.5 select-none"
                  >
                    <Plus className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="hover:text-[#37352f]">New page</span>
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-10 px-4">
                  <span className="text-xl block mb-1.5">📂</span>
                  <p className="text-xs font-semibold text-[#7c7b77]">No matching entries found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getNotionColorClasses(color?: string): string {
  switch (color) {
    case "green":
      return "bg-[#edf6f2] text-[#0f7b53] border-[#d2ebd9]";
    case "blue":
      return "bg-[#eef6fc] text-[#0969da] border-[#d1e7f9]";
    case "red":
      return "bg-[#fdf2f2] text-[#cf222e] border-[#fbd5d5]";
    case "orange":
      return "bg-[#fff9eb] text-[#b07000] border-[#fdecce]";
    case "yellow":
      return "bg-[#fcfbee] text-[#8f6b00] border-[#fbf3db]";
    case "purple":
      return "bg-[#fbf4fc] text-[#8250df] border-[#f3e2f9]";
    case "pink":
      return "bg-[#fdf4f7] text-[#bf3989] border-[#fbcce3]";
    case "gray":
      return "bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]";
    default:
      return "bg-[#f3f4f6] text-[#37352f] border-[#e5e7eb]";
  }
}
