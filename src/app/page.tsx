import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { NotionLogo } from "@/components/notion-logo";
import { SearchCommand } from "@/components/SearchCommand";
import { InteractiveButton } from "@/components/InteractiveButton";
import { InteractiveDatabase } from "@/components/InteractiveDatabase";
import { cn } from "@/lib/utils";
import { getCached, setCached } from "@/lib/cache";
import { AIChatbot } from "@/components/AIChatbot";
import { Block, Page } from "@/lib/types";
import { BlockRenderer, PageIcon, RichTextRenderer } from "@/components/BlockRenderer";
import { MOCK_PAGES, MOCK_PAGE_CONTENTS } from "@/lib/mockData";

// Import shadcn components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Import Lucide icons
import { 
  FileText, 
  Search, 
  LogOut, 
  ExternalLink, 
  Activity, 
  User, 
  Files, 
  AlertTriangle,
  FileCode,
  Info,
  Sparkles
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getSession();

  // If no session exists, redirect to login
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const pageIdParam = typeof params.pageId === "string" ? params.pageId : undefined;
  const selectedPageId = pageIdParam;
  const isViewingSpecificPage = !!selectedPageId;
  const isViewingAI = params.ai === "true";

  let pages: any[] = [];
  let fetchError: string | null = null;
  
  // 1. Pages Search list
  let searchData: any = null;
  if (!session.isMock) {
    const cacheKey = `search:${session.accessToken}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      searchData = cached;
    } else {
      searchData = fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: { property: "object", value: "page" },
          page_size: 100,
        }),
        cache: "no-store",
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCached(cacheKey, data, 15000); // cache search list for 15 seconds
          return data;
        }
        return null;
      }).catch(err => {
        console.error("Search list fetch exception:", err);
        return null;
      });
    }
  }

  // 2. Individual Page Details (if page selected)
  let pageDetailsData: any = null;
  if (selectedPageId && !session.isMock) {
    const cacheKey = `page-details:${selectedPageId}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      pageDetailsData = cached;
    } else {
      pageDetailsData = fetch(`https://api.notion.com/v1/pages/${selectedPageId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Notion-Version": "2022-06-28",
        },
        cache: "no-store",
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCached(cacheKey, data, 30000); // Cache metadata for 30s
          return data;
        }
        return null;
      }).catch(err => {
        console.error("Page details fetch exception:", err);
        return null;
      });
    }
  }

  // 3. Page Blocks (if page selected)
  let blocksData: any = null;
  if (selectedPageId && !session.isMock) {
    const cacheKey = `page-blocks:${selectedPageId}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      blocksData = cached;
    } else {
      blocksData = fetch(`https://api.notion.com/v1/blocks/${selectedPageId}/children`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Notion-Version": "2022-06-28",
        },
        cache: "no-store",
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCached(cacheKey, data, 10000); // Cache blocks for 10s
          return data;
        }
        return null;
      }).catch(err => {
        console.error("Page blocks fetch exception:", err);
        return null;
      });
    }
  }

  // Resolve all API requests in parallel!
  const [resolvedSearch, resolvedDetails, resolvedBlocks] = await Promise.all([
    searchData instanceof Promise ? searchData : Promise.resolve(searchData),
    pageDetailsData instanceof Promise ? pageDetailsData : Promise.resolve(pageDetailsData),
    blocksData instanceof Promise ? blocksData : Promise.resolve(blocksData),
  ]);

  // Process pages list
  if (session.isMock) {
    pages = MOCK_PAGES;
  } else if (resolvedSearch) {
    pages = resolvedSearch.results.map((page: any) => {
      const titleProp = page.properties?.title || page.properties?.Name || page.properties?.name;
      const titleArray = titleProp?.title || titleProp?.rich_text;
      const title =
        titleArray && titleArray.length > 0
          ? titleArray.map((t: any) => t.plain_text).join("")
          : "Untitled Page";

      let icon = null;
      if (page.icon?.type === "emoji") {
        icon = page.icon.emoji;
      } else if (page.icon?.type === "external") {
        icon = page.icon.external.url;
      } else if (page.icon?.type === "file") {
        icon = page.icon.file.url;
      }

      return {
        id: page.id,
        title,
        url: page.url,
        created: new Date(page.created_time).toLocaleDateString(),
        last_edited: new Date(page.last_edited_time).toLocaleDateString(),
        emoji: icon,
      };
    });
  } else {
    fetchError = "Connection failed. Please check your credentials or API status.";
  }

  // Determine selected page metadata
  let selectedPage = selectedPageId ? pages.find((p) => p.id === selectedPageId) : null;
  if (selectedPageId && !selectedPage && !session.isMock && resolvedDetails) {
    const titleProp = resolvedDetails.properties?.title || resolvedDetails.properties?.Name || resolvedDetails.properties?.name;
    const titleArray = titleProp?.title || titleProp?.rich_text;
    const title =
      titleArray && titleArray.length > 0
        ? titleArray.map((t: any) => t.plain_text).join("")
        : "Untitled Page";

    let icon = null;
    if (resolvedDetails.icon?.type === "emoji") {
      icon = resolvedDetails.icon.emoji;
    } else if (resolvedDetails.icon?.type === "external") {
      icon = resolvedDetails.icon.external.url;
    } else if (resolvedDetails.icon?.type === "file") {
      icon = resolvedDetails.icon.file.url;
    }

    selectedPage = {
      id: resolvedDetails.id,
      title,
      url: resolvedDetails.url,
      created: new Date(resolvedDetails.created_time).toLocaleDateString(),
      last_edited: new Date(resolvedDetails.last_edited_time).toLocaleDateString(),
      emoji: icon,
    };
  }

  // Process selected page blocks content
  let pageBlocks: Block[] = [];
  let blockFetchError: string | null = null;

  if (selectedPageId) {
    if (session.isMock) {
      pageBlocks = MOCK_PAGE_CONTENTS[selectedPageId]?.blocks || [];
    } else if (resolvedBlocks) {
      try {
        pageBlocks = await Promise.all(
          resolvedBlocks.results.map(async (block: any) => {
            const type = block.type;
            let content = "";
            let checked = false;
            let language = "typescript";

            if (block[type]?.rich_text) {
              content = block[type].rich_text.map((t: any) => t.plain_text).join("");
            }

            if (type === "to_do") {
              checked = !!block.to_do.checked;
            } else if (type === "code") {
              language = block.code.language || "typescript";
            }

            // Simple Table handling - fetch table row children
            if (type === "table") {
              try {
                const tableCacheKey = `table-rows:${block.id}`;
                let rowData = getCached<any>(tableCacheKey);
                if (!rowData) {
                  const rowRes = await fetch(`https://api.notion.com/v1/blocks/${block.id}/children`, {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${session.accessToken}`,
                      "Notion-Version": "2022-06-28",
                    },
                    cache: "no-store",
                  });
                  if (rowRes.ok) {
                    rowData = await rowRes.json();
                    setCached(tableCacheKey, rowData, 30000); // cache table rows for 30s
                  }
                }
                
                if (rowData) {
                  const rows = rowData.results.map((rowBlock: any) => {
                    if (rowBlock.type === "table_row" && rowBlock.table_row?.cells) {
                      return rowBlock.table_row.cells; // return rich text arrays!
                    }
                    return [];
                  });
                  return {
                    type,
                    content: "",
                    rows,
                    table_width: block.table.table_width,
                    has_column_header: block.table.has_column_header,
                  };
                }
              } catch (err) {
                console.error("Error fetching table children:", err);
              }
            }

            // Child database handling - query database items
            if (type === "child_database") {
              try {
                const dbCacheKey = `db-query:${block.id}`;
                let dbData = getCached<any>(dbCacheKey);
                if (!dbData) {
                  const dbRes = await fetch(`https://api.notion.com/v1/databases/${block.id}/query`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${session.accessToken}`,
                      "Notion-Version": "2022-06-28",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ page_size: 10 }),
                    cache: "no-store",
                  });
                  if (dbRes.ok) {
                    dbData = await dbRes.json();
                    setCached(dbCacheKey, dbData, 15000); // cache database queries for 15s
                  }
                }

                if (dbData) {
                  const rows = dbData.results.map((page: any) => {
                    const rowData: Record<string, string> = {};
                    rowData.id = page.id;
                    Object.keys(page.properties).forEach((propName) => {
                      const prop = page.properties[propName];
                      let val = "";
                      if (prop.type === "title") {
                        val = prop.title.map((t: any) => t.plain_text).join("");
                      } else if (prop.type === "rich_text") {
                        val = prop.rich_text.map((t: any) => t.plain_text).join("");
                      } else if (prop.type === "select" && prop.select) {
                        val = JSON.stringify({ 
                          type: "select", 
                          tag: { name: prop.select.name, color: prop.select.color } 
                        });
                      } else if (prop.type === "multi_select" && prop.multi_select && prop.multi_select.length > 0) {
                        val = JSON.stringify({ 
                          type: "multi_select", 
                          tags: prop.multi_select.map((s: any) => ({ name: s.name, color: s.color })) 
                        });
                      } else if (prop.type === "status" && prop.status) {
                        val = prop.status.name;
                      } else if (prop.type === "date") {
                        val = prop.date?.start || "";
                      } else if (prop.type === "checkbox") {
                        val = prop.checkbox ? "Yes" : "No";
                      } else if (prop.type === "number") {
                        val = prop.number?.toString() || "";
                      } else if (prop.type === "url") {
                        val = prop.url || "";
                      } else if (prop.type === "email") {
                        val = prop.email || "";
                      } else if (prop.type === "phone_number") {
                        val = prop.phone_number || "";
                      }
                      rowData[propName] = val;
                    });
                    return rowData;
                  });
                  
                  const firstPage = dbData.results[0];
                  let columns: string[] = [];
                  if (firstPage) {
                    const props = firstPage.properties;
                    const titleKey = Object.keys(props).find(k => props[k].type === "title");
                    const otherKeys = Object.keys(props).filter(k => props[k].type !== "title");
                    columns = titleKey ? [titleKey, ...otherKeys] : Object.keys(props);
                  }

                  return {
                    type,
                    content: block.child_database.title,
                    database_title: block.child_database.title,
                    database_rows: rows,
                    database_columns: columns,
                  };
                }
              } catch (err) {
                console.error("Error querying child database:", err);
              }
            }

            // Image block handling
            if (type === "image" && block.image) {
              const imgType = block.image.type;
              const src = imgType === "external" ? block.image.external.url : block.image.file?.url;
              const caption = block.image.caption?.map((t: any) => t.plain_text).join("") || "";
              return {
                type,
                content: src || "",
                caption,
              };
            }

            // Video block handling
            if (type === "video" && block.video) {
              const vidType = block.video.type;
              const src = vidType === "external" ? block.video.external.url : block.video.file?.url;
              const caption = block.video.caption?.map((t: any) => t.plain_text).join("") || "";
              return {
                type,
                content: src || "",
                caption,
              };
            }

            // PDF block handling
            if (type === "pdf" && block.pdf) {
              const pdfType = block.pdf.type;
              const src = pdfType === "external" ? block.pdf.external.url : block.pdf.file?.url;
              const caption = block.pdf.caption?.map((t: any) => t.plain_text).join("") || "";
              return {
                type,
                content: src || "",
                caption,
              };
            }

            // Embed block handling
            if (type === "embed" && block.embed) {
              const caption = block.embed.caption?.map((t: any) => t.plain_text).join("") || "";
              return {
                type,
                content: block.embed.url || "",
                caption,
              };
            }

            // Equation block handling
            if (type === "equation" && block.equation?.expression) {
              return {
                type,
                content: block.equation.expression,
              };
            }

            // Button blocks (API returns as "unsupported" block with block_type: "button")
            if (type === "unsupported" && block.unsupported?.block_type === "button") {
              return {
                type: "button",
                content: "Run Action",
                button_text: "Button Action",
                button_icon: "⚡",
              };
            }

            return {
              type,
              content,
              checked,
              language,
            };
          })
        );
      } catch (err) {
        console.error("Error processing blocks:", err);
        blockFetchError = "Failed to load page blocks.";
      }
    } else {
      blockFetchError = "Failed to load page blocks.";
    }
  }

  // Calculate session expiry remaining time
  const ageMs = Date.now() - session.createdAt;
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const remainingHours = Math.max(0, Math.floor((threeDaysMs - ageMs) / (1000 * 60 * 60)));
  const daysLeft = Math.floor(remainingHours / 24);
  const hoursLeft = remainingHours % 24;

  return (
    <div className="flex h-screen w-full bg-white text-[#37352f] antialiased select-none font-sans overflow-hidden">
      
      {/* Left Sidebar */}
      <aside className="w-[240px] flex-shrink-0 bg-[#f7f7f5] border-r border-[#edece9] flex flex-col justify-between h-full select-none">
        <div>
          {/* Workspace Info Card */}
          <Link href="/" className="p-3.5 flex items-center justify-between border-b border-[#edece9] hover:bg-[#edece9]/40 cursor-pointer transition-colors block">
            <div className="flex items-center gap-2 max-w-[170px] truncate">
              {session.workspaceIcon ? (
                <span className="text-xl flex-shrink-0">{session.workspaceIcon}</span>
              ) : (
                <div className="h-6 w-6 rounded bg-black text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  N
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="text-[13px] font-semibold text-[#37352f] truncate leading-none">
                  {session.workspaceName || "Workspace"}
                </span>
                <span className="text-[11px] text-[#7a7a78] mt-1 truncate leading-none">
                  {session.ownerName || "Notion Member"}
                </span>
              </div>
            </div>
            
            {/* Connected Indicator */}
            <div className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </div>
          </Link>

          {/* Interactive Search bar component (Ctrl+K and Click trigger) */}
          <SearchCommand pages={pages} />

          {/* Notion AI Chatbot Menu Item */}
          <div className="px-2 py-1.5 border-b border-[#edece9] select-none">
            <Link 
              href="/?ai=true"
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors block",
                pageIdParam === undefined && params.ai === "true"
                  ? "bg-[#edece9] text-[#1a1a1a]" 
                  : "text-[#37352f] hover:bg-[#edece9]/40"
              )}
            >
              <div className="flex items-center gap-2.5 w-full">
                <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span className="flex-1 text-left font-sans">Notion AI Chatbot</span>
                <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-95 font-sans">New</span>
              </div>
            </Link>
          </div>

          {/* Sidebar Navigation Pages */}
          <nav className="px-2 py-1 space-y-0.5 max-h-[calc(100vh-220px)] overflow-y-auto">
            <span className="text-[11px] font-semibold text-[#7a7a78] tracking-wider uppercase px-2 py-1.5 block">
              Pages ({pages.length})
            </span>
            {pages.map((page) => {
              const isActive = page.id === selectedPageId;
              return (
                <Link
                  key={page.id}
                  href={`/?pageId=${page.id}`}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors truncate ${
                    isActive
                      ? "bg-[#edece9] text-[#37352f] font-semibold"
                      : "text-[#6a6965] hover:bg-[#edece9]/60 hover:text-[#37352f]"
                  }`}
                >
                  <PageIcon emoji={page.emoji} className="w-4 h-4" />
                  <span className="truncate">{page.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Details */}
        <div className="p-3 border-t border-[#edece9] bg-[#f7f7f5] space-y-3">
          {/* Expiry Widget */}
          <div className="text-[11px] text-[#7c7b77] space-y-1">
            <div className="flex justify-between">
              <span>Session:</span>
              <span className="font-semibold text-[#37352f]">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Expires in:</span>
              <span className="font-semibold text-[#37352f]">
                {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <a
            href="/api/auth/logout"
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-[#e3e2e0] rounded-md text-sm font-medium bg-white hover:bg-[#f7f7f5] active:bg-[#edece9] transition-all text-[#d44] hover:text-[#c33] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        
        {/* Top Header Bar */}
        <header className="h-[48px] border-b border-[#edece9] px-6 flex items-center justify-between text-[13px] text-[#7a7a78] select-none">
          <div className="flex items-center gap-1.5 font-semibold text-[#37352f]">
            {session.workspaceIcon && <span className="text-sm">{session.workspaceIcon}</span>}
            <Link href="/" className="hover:underline truncate max-w-[180px]">
              {session.workspaceName || "Workspace"}
            </Link>
            
            {isViewingAI && (
              <>
                <span className="text-[#a4a3a1] font-normal font-sans">/</span>
                <span className="text-[#7a7a78] font-semibold truncate max-w-[180px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Notion AI Chatbot</span>
                </span>
              </>
            )}
            {!isViewingAI && selectedPage && (
              <>
                <span className="text-[#a4a3a1] font-normal font-sans">/</span>
                <span className="text-[#7a7a78] font-semibold truncate max-w-[180px] flex items-center gap-1">
                  <PageIcon emoji={selectedPage.emoji} className="w-3.5 h-3.5" />
                  <span>{selectedPage.title}</span>
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {session.isMock ? (
              <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] hover:bg-amber-100/50 px-2 py-0.5">
                Sandbox Mode
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] hover:bg-emerald-100/50 px-2 py-0.5">
                Connected
              </Badge>
            )}
            <span className="text-xs text-[#7a7a78]">Notion AI</span>
          </div>
        </header>

        {/* Banner Alert for Sandbox Mode */}
        {session.isMock && (
          <div className="bg-amber-50 border-b border-amber-200/60 px-6 py-3 text-sm text-amber-800 flex items-center justify-between leading-relaxed">
            <div>
              <strong>🚀 Sandbox Mode Active:</strong> Pulling top 20 mock pages. Setup keys in <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code> to sync real pages.
            </div>
            <a
              href="/api/auth/logout"
              className="text-amber-900 font-semibold underline hover:text-amber-950 ml-4 whitespace-nowrap"
            >
              Sign out to re-auth
            </a>
          </div>
        )}

        {/* Scrollable Document Area Container (spans full width, scrollbar floats far right) */}
        <div className="flex-1 overflow-y-auto select-text">
          {/* Centered Content Wrapper */}
          <div className="px-12 py-10 max-w-4xl w-full mx-auto">
            
            {/* CONDITION 3: NOTION AI CHATBOT VIEW */}
            {isViewingAI ? (
              <AIChatbot pages={pages} />
            ) : isViewingSpecificPage && selectedPage ? (
              <div className="space-y-6">
                {/* Page Cover/Header */}
                <div className="mb-8 border-b border-[#f1f1ef] pb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl select-none">
                      <PageIcon emoji={selectedPage.emoji} className="w-10 h-10" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-extrabold text-[#1a1a1a] leading-tight tracking-tight">
                        {selectedPage.title}
                      </h1>
                      <p className="text-xs text-[#7c7b77] mt-1 select-none">
                        Created: {selectedPage.created} • Edited: {selectedPage.last_edited}
                      </p>
                    </div>
                  </div>
                  
                  <a
                    href={selectedPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#e3e2e0] rounded-md bg-white hover:bg-[#f7f7f5] text-sm font-semibold text-[#37352f] transition-all cursor-pointer select-none"
                  >
                    Open in Notion
                    <ExternalLink className="w-4 h-4 text-[#7c7b77]" />
                  </a>
                </div>

                {/* Render Blocks */}
                <div className="prose max-w-none">
                  {blockFetchError && (
                    <div className="text-center py-8 text-sm text-red-600 font-medium">
                      {blockFetchError}
                    </div>
                  )}
                  
                  {pageBlocks.length === 0 && !blockFetchError ? (
                    <div className="text-center py-12 text-sm text-[#7c7b77]">
                      This page has no content.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pageBlocks.map((block, idx) => (
                        <BlockRenderer key={idx} block={block} isMock={!!session.isMock} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* CONDITION 2: ROOT LANDING VIEW (Shows overview summary, the 3 cards, and top page list) */
              <div className="space-y-8">
                {/* Workspace Header */}
                <div className="mb-6">
                  <span className="text-6xl block mb-3 select-none">{session.workspaceIcon || "🔮"}</span>
                  <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">
                    {session.workspaceName || "Workspace Dashboard"}
                  </h1>
                  <p className="text-sm text-[#7c7b77] mt-1 select-none">
                    Connected workspace integration. Active user: <span className="font-semibold text-[#37352f]">{session.ownerName}</span>
                  </p>
                </div>

                {/* Statistics Grid - Rendered ONLY on main/root workspace page */}
                <div className="grid grid-cols-3 gap-4 select-none">
                  <Card className="shadow-none border-[#edece9] bg-[#f7f7f5]/40 hover:bg-[#f7f7f5]/70 transition-all">
                    <CardHeader className="p-4 pb-1.5">
                      <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-[#7a7a78] flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" /> Connection
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardTitle className="text-base font-bold text-[#1a1a1a]">
                        Active
                      </CardTitle>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-[#edece9] bg-[#f7f7f5]/40 hover:bg-[#f7f7f5]/70 transition-all">
                    <CardHeader className="p-4 pb-1.5">
                      <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-[#7a7a78] flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#7a7a78]" /> Workspace Owner
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardTitle className="text-sm font-bold text-[#1a1a1a] truncate">
                        {session.ownerName || "Notion Member"}
                      </CardTitle>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-[#edece9] bg-[#f7f7f5]/40 hover:bg-[#f7f7f5]/70 transition-all">
                    <CardHeader className="p-4 pb-1.5">
                      <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-[#7a7a78] flex items-center gap-1">
                        <Files className="w-3.5 h-3.5 text-[#7a7a78]" /> Top Shared Pages
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardTitle className="text-base font-bold text-[#1a1a1a]">
                        {pages.length} Accessible
                      </CardTitle>
                    </CardContent>
                  </Card>
                </div>

                {/* API Search Error Block */}
                {fetchError && (
                  <Card className="border-red-200 bg-red-50/50 text-red-800">
                    <CardHeader className="p-4 pb-1.5">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-red-600" /> API Retrieval Failed</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs">
                      <p>{fetchError}</p>
                      <p className="mt-2 text-[10px] text-red-600 font-mono">
                        Ensure integration is set to public, and pages are shared.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Shared Pages List */}
                <div>
                  <h2 className="text-base font-bold text-[#1a1a1a] mb-4 border-b border-[#edece9] pb-2 uppercase tracking-wide">
                    Top Workspace Pages
                  </h2>
                  
                  {pages.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-[#edece9] rounded-xl bg-[#f7f7f5]/10">
                      <span className="text-4xl block mb-2">📂</span>
                      <h3 className="text-base font-semibold text-[#37352f]">No shared pages found</h3>
                      <p className="text-sm text-[#7c7b77] mt-1 max-w-[280px] mx-auto leading-relaxed">
                        Make sure to select and share pages when authorizing the integration.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[#edece9] rounded-xl overflow-hidden shadow-none bg-white">
                      <div className="min-w-full divide-y divide-[#edece9]">
                        {/* Table Header */}
                        <div className="bg-[#f7f7f5]/60 grid grid-cols-12 text-[11px] font-bold text-[#7a7a78] tracking-wider uppercase py-2.5 px-4">
                          <div className="col-span-7">Page Title</div>
                          <div className="col-span-2">Created</div>
                          <div className="col-span-3 text-right">Actions</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-[#edece9]">
                          {pages.map((page) => (
                            <div
                              key={page.id}
                              className="grid grid-cols-12 items-center py-3.5 px-4 text-sm hover:bg-[#f7f7f5]/30 transition-colors"
                            >
                              <div className="col-span-7 flex items-center gap-2 truncate pr-4">
                                <PageIcon emoji={page.emoji} className="w-4 h-4" />
                                <span className="font-semibold text-[#1a1a1a] truncate hover:underline">
                                  <Link href={`/?pageId=${page.id}`}>
                                    {page.title}
                                  </Link>
                                </span>
                              </div>
                              <div className="col-span-2 text-[#7c7b77] text-xs">{page.created}</div>
                              <div className="col-span-3 text-right">
                                <a
                                  href={page.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#e3e2e0] rounded bg-white hover:bg-[#f7f7f5] text-xs font-semibold text-[#37352f] transition-all cursor-pointer"
                                >
                                  View in Notion
                                  <ExternalLink className="w-3.5 h-3.5 text-[#7c7b77]" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
      
    </div>
  );
}
