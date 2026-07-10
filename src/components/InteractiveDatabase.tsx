"use client";

import React, { useState, useEffect } from "react";
import { Table, Plus, Search, Calendar, Tag, ChevronDown, Filter, X, ExternalLink, Info, FileCode, CornerDownLeft, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";
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

/* Client-side Rich Text Renderer (supports inline equations) */
function ClientRichTextRenderer({ textArr }: { textArr?: any }) {
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

/* Client-side Block Renderer for side-peek drawer */
function ClientBlockRenderer({ block }: { block: any }) {
  const { type, content, checked, language, rows, has_column_header, database_title, database_rows, database_columns, button_text, button_icon } = block;

  switch (type) {
    case "heading_1":
      return <h1 className="text-2xl font-bold text-[#1a1a1a] mt-5 mb-2.5 border-b border-[#edece9] pb-1.5 leading-tight">{content}</h1>;
    case "heading_2":
      return <h2 className="text-xl font-semibold text-[#1a1a1a] mt-4 mb-2 leading-snug">{content}</h2>;
    case "heading_3":
      return <h3 className="text-lg font-semibold text-[#1a1a1a] mt-3 mb-1.5 leading-snug">{content}</h3>;
    case "paragraph":
      return <p className="text-sm text-[#37352f] leading-relaxed mb-3">{content}</p>;
    case "bulleted_list_item":
      return (
        <div className="flex items-start gap-2 text-sm text-[#37352f] mb-1.5 pl-1">
          <span className="text-[#a4a3a1] select-none text-base leading-none">•</span>
          <span className="leading-relaxed">{content}</span>
        </div>
      );
    case "to_do":
      return (
        <div className="flex items-start gap-2 text-sm text-[#37352f] mb-1.5 pl-0.5">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-0.5 h-3.5 w-3.5 rounded border-[#e3e2e0] text-[#2383e2] cursor-not-allowed"
          />
          <span className={cn("leading-relaxed", checked && "line-through text-[#7c7b77]")}>{content}</span>
        </div>
      );
    case "code":
      return (
        <div className="my-3">
          <div className="flex justify-between items-center bg-[#edece9]/20 px-3 py-1 border-t border-l border-r border-[#edece9] rounded-t-md text-[10px] text-[#7a7a78] font-mono select-none">
            <span className="flex items-center gap-1"><FileCode className="w-3 h-3" /> {language || "code"}</span>
            <span>Read-Only</span>
          </div>
          <CodeBlock code={content} language={language || "javascript"} />
        </div>
      );
    case "equation":
      return (
        <div className="my-5 flex justify-center text-neutral-800">
          <Latex math={content} block={true} />
        </div>
      );
    case "quote":
      return <blockquote className="pl-3.5 border-l-[3px] border-[#37352f] text-sm italic text-[#6a6965] my-3 leading-relaxed">{content}</blockquote>;
    case "callout":
      return (
        <div className="flex gap-2.5 p-3.5 bg-[#f7f7f5] border border-[#edece9] rounded-xl text-sm text-[#37352f] my-3 leading-relaxed items-start">
          <Info className="w-4 h-4 text-[#7a7a78] mt-0.5 flex-shrink-0" />
          <div>{content}</div>
        </div>
      );
    case "table":
      return (
        <div className="my-3 overflow-x-auto border border-[#edece9] rounded-lg">
          <table className="min-w-full divide-y divide-[#edece9] border-collapse">
            <tbody className="divide-y divide-[#edece9]">
              {(rows || []).map((row: any, rIdx: number) => {
                const isHeader = rIdx === 0 && has_column_header;
                return (
                  <tr key={rIdx} className={cn(isHeader ? "bg-[#f7f7f5]/50 font-semibold" : "hover:bg-[#f7f7f5]/10")}>
                    {row.map((cell: any, cIdx: number) => {
                      const CellTag = isHeader ? "th" : "td";
                      return (
                        <CellTag key={cIdx} className="px-3 py-2 text-xs text-left border border-[#edece9] text-[#37352f]">
                          <ClientRichTextRenderer textArr={cell} />
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
          databaseTitle={database_title || content} 
          initialRows={database_rows} 
          columns={database_columns} 
        />
      );
    default:
      return null;
  }
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
  
  // Side-Peek Drawer State
  const [openRow, setOpenRow] = useState<DatabaseRow | null>(null);
  const [peekBlocks, setPeekBlocks] = useState<any[]>([]);
  const [peekLoading, setPeekLoading] = useState(false);
  const [peekError, setPeekError] = useState<string | null>(null);

  // Fetch page blocks when opening a row
  useEffect(() => {
    if (!openRow) {
      setPeekBlocks([]);
      return;
    }

    const fetchBlocks = async () => {
      setPeekLoading(true);
      setPeekError(null);
      try {
        const response = await fetch(`/api/blocks/${openRow.id}`);
        if (!response.ok) {
          throw new Error(`Failed to load page content: ${response.statusText}`);
        }
        const data = await response.json();
        setPeekBlocks(data.blocks || []);
      } catch (err: any) {
        console.error("Error fetching database row blocks:", err);
        setPeekError(err.message || "Failed to load page content.");
      } finally {
        setPeekLoading(false);
      }
    };

    fetchBlocks();
  }, [openRow]);

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
    if (openRow && openRow.id === id) {
      setOpenRow(null);
    }
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
    if (nameLower.includes("name") || nameLower.includes("title") || nameLower.includes("subject")) return <Table className="w-3.5 h-3.5 text-neutral-400" />;
    if (nameLower.includes("status")) return <Tag className="w-3.5 h-3.5 text-neutral-400" />;
    if (nameLower.includes("date") || nameLower.includes("created")) return <Calendar className="w-3.5 h-3.5 text-neutral-400" />;
    return <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />;
  };

  const handleOpenRow = (row: DatabaseRow) => {
    setOpenRow(row);
  };

  return (
    <div className="my-6 border border-[#edece9] rounded-xl overflow-hidden shadow-sm bg-white select-text relative">
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
          <thead className="bg-[#f7f7f5]/40 select-none">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-semibold text-[#7a7a78] tracking-tight uppercase"
                >
                  <div className="flex items-center gap-1.5">
                    {getColIcon(col)}
                    <span>{col}</span>
                  </div>
                </th>
              ))}
              <th scope="col" className="relative px-4 py-2 w-10">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          {/* Table Data */}
          <tbody className="bg-white divide-y divide-[#edece9]">
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-[#f7f7f5]/20 group transition-colors">
                  {columns.map((col, index) => {
                    const value = row[col] || "";
                    const isName = index === 0;
                    
                    let renderedValue = <span className="text-[#37352f] whitespace-normal break-words">{value}</span>;

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
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-[#1a1a1a] whitespace-normal break-words">{value}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRow(row);
                            }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white hover:bg-[#edece9] text-[10px] text-[#37352f] rounded border border-[#e3e2e0] shadow-sm transition-all font-semibold cursor-pointer select-none"
                          >
                            Open
                          </button>
                        </div>
                      );
                    } else if (col.toLowerCase() === "status") {
                      renderedValue = (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          STATUS_COLORS[value] || "bg-neutral-50 text-neutral-600 border-neutral-200/50"
                        )}>
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
                      <td key={col} className="px-4 py-2.5 text-xs">
                        {renderedValue}
                      </td>
                    );
                  })}
                  
                  {/* Delete actions */}
                  <td className="px-4 py-2.5 text-right w-10 select-none">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs font-semibold transition-opacity px-1.5 py-0.5 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
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

      {/* Slide-out Side-Peek Drawer Panel */}
      {openRow && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setOpenRow(null)}
            className="absolute inset-0 bg-[#000000]/15 backdrop-blur-[1px] transition-opacity animate-fade-in"
          />

          {/* Drawer Panel */}
          <div 
            className="absolute top-0 right-0 bottom-0 w-full max-w-2xl bg-white border-l border-[#edece9] shadow-2xl flex flex-col h-full animate-slide-in-right select-text"
            style={{
              animation: "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#edece9] select-none">
              <div className="flex items-center gap-2 text-xs text-[#7a7a78]">
                <Table className="w-3.5 h-3.5" />
                <span>Database Entry</span>
                <span>/</span>
                <span className="font-medium text-[#37352f] truncate max-w-[200px]">{openRow[columns[0]]}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpenRow(null)}
                  className="p-1 hover:bg-[#edece9] rounded text-[#7a7a78] hover:text-[#37352f] transition-all focus:outline-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body Scroll Container */}
            <div className="flex-1 overflow-y-auto px-10 py-8">
              {/* Page Title Header */}
              <div className="mb-6">
                <div className="text-4xl block mb-3 select-none">📄</div>
                <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight leading-tight">
                  {openRow[columns[0]]}
                </h1>
              </div>

              {/* Properties Grid */}
              <div className="border border-[#edece9] rounded-xl p-4 bg-[#f7f7f5]/30 mb-8 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a78] mb-2 select-none">Properties</div>
                
                <div className="grid grid-cols-12 gap-y-2.5 text-xs">
                  {columns.slice(1).map((col) => {
                    const val = openRow[col] || "";
                    let displayVal = <span className="text-[#37352f]">{val}</span>;

                    if (val.startsWith('{"type":')) {
                      try {
                        const parsed = JSON.parse(val);
                        if (parsed.type === "multi_select" && parsed.tags) {
                          displayVal = (
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
                          displayVal = (
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
                        // ignore
                      }
                    } else if (col.toLowerCase() === "status") {
                      displayVal = (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          STATUS_COLORS[val] || "bg-neutral-50 text-neutral-600 border-neutral-200/50"
                        )}>
                          {val}
                        </span>
                      );
                    } else if (col.toLowerCase() === "priority") {
                      displayVal = (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold border",
                          PRIORITY_COLORS[val] || "bg-neutral-50 text-neutral-600 border-neutral-200/50"
                        )}>
                          {val}
                        </span>
                      );
                    }

                    return (
                      <React.Fragment key={col}>
                        <div className="col-span-4 text-[#7c7b77] font-medium flex items-center select-none">
                          {getColIcon(col)}
                          <span className="ml-1.5">{col}</span>
                        </div>
                        <div className="col-span-8 flex items-center">{displayVal}</div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <hr className="border-[#edece9] mb-6 select-none" />

              {/* Page Children Blocks Area */}
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
                      <ClientBlockRenderer key={index} block={block} />
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
