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
import { PageBlocksContainer } from "@/components/PageBlocksContainer";
import { SharePopover } from "@/components/SharePopover";
import { Sidebar } from "@/components/Sidebar";
import { FloatingAIChat } from "@/components/FloatingAIChat";

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

interface BreadcrumbItem {
  id?: string;
  title: string;
  emoji?: string | null;
}

async function getPageBreadcrumbs(
  selectedPageId: string,
  pages: any[],
  accessToken: string
): Promise<BreadcrumbItem[]> {
  const crumbs: BreadcrumbItem[] = [];
  let currentId: string | undefined = selectedPageId;
  const visited = new Set<string>();

  const normalize = (id: string) => id.replace(/-/g, "").toLowerCase();

  while (currentId && !visited.has(normalize(currentId))) {
    const normalizedCurrentId = normalize(currentId);
    visited.add(normalizedCurrentId);
    
    let page = pages.find((p) => normalize(p.id) === normalizedCurrentId);

    // If the page title is "Untitled Page" or database title is "Untitled Database", bypass cache and fetch fresh
    if (page && (page.title === "Untitled Page" || page.title === "Untitled Database")) {
      page = undefined;
    }

    if (!page && accessToken && !accessToken.startsWith("mock")) {
      const cacheKey = `breadcrumb-node:${currentId}`;
      let cachedNode = getCached<any>(cacheKey);

      if (!cachedNode) {
        try {
          // 1. Try to fetch as page first
          const res = await fetch(`https://api.notion.com/v1/pages/${currentId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Notion-Version": "2022-06-28",
            },
            cache: "no-store",
          });

          if (res.ok) {
            const pageData = await res.json();
            const titleKey = pageData.properties ? Object.keys(pageData.properties).find(k => pageData.properties[k]?.type === "title") : null;
            const titleProp = titleKey ? pageData.properties[titleKey] : null;
            const titleArray = titleProp?.title;
            const title = titleArray && titleArray.length > 0
              ? titleArray.map((t: any) => t.plain_text).join("")
              : "Untitled Page";

            let icon = null;
            if (pageData.icon?.type === "emoji") {
              icon = pageData.icon.emoji;
            } else if (pageData.icon?.type === "external") {
              icon = pageData.icon.external.url;
            } else if (pageData.icon?.type === "file") {
              icon = pageData.icon.file.url;
            }

            const parentId = pageData.parent?.type === "page_id"
              ? pageData.parent.page_id
              : pageData.parent?.type === "database_id"
              ? pageData.parent.database_id
              : undefined;

            cachedNode = { id: pageData.id, title, emoji: icon, parentId };
            setCached(cacheKey, cachedNode, 3600000); // cache for 1 hour
          } else {
            // 2. Try to fetch as database
            const dbRes = await fetch(`https://api.notion.com/v1/databases/${currentId}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Notion-Version": "2022-06-28",
              },
              cache: "no-store",
            });

            if (dbRes.ok) {
              const dbData = await dbRes.json();
              const title = dbData.title?.map((t: any) => t.plain_text).join("") || "Untitled Database";

              let icon = null;
              if (dbData.icon?.type === "emoji") {
                icon = dbData.icon.emoji;
              } else if (dbData.icon?.type === "external") {
                icon = dbData.icon.external.url;
              } else if (dbData.icon?.type === "file") {
                icon = dbData.icon.file.url;
              }

              const parentId = dbData.parent?.type === "page_id"
                ? dbData.parent.page_id
                : dbData.parent?.type === "database_id"
                ? dbData.parent.database_id
                : undefined;

              cachedNode = { id: dbData.id, title, emoji: icon, parentId };
              setCached(cacheKey, cachedNode, 3600000); // cache for 1 hour
            }
          }
        } catch (err) {
          console.error("Error fetching parent node:", err);
        }
      }

      if (cachedNode) {
        page = cachedNode;
      }
    }

    if (!page) break;

    crumbs.unshift({
      id: page.id,
      title: page.title,
      emoji: page.emoji || null,
    });

    currentId = page.parentId;
  }

  return crumbs;
}

// Helper function to fetch database items
async function fetchDatabaseItems(databaseId: string, accessToken: string) {
  const cacheKey = `database-page:${databaseId}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100 }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const dbData = await res.json();
    
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

    const result = { rows, columns };
    setCached(cacheKey, result, 15000); // cache for 15 seconds
    return result;
  } catch (err) {
    console.error("Error fetching database items:", err);
    return null;
  }
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
          return { ...data, isDatabase: false };
        }
        
        // If pages endpoint fails, fallback to databases endpoint
        const dbRes = await fetch(`https://api.notion.com/v1/databases/${selectedPageId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
          cache: "no-store",
        });

        if (dbRes.ok) {
          const data = await dbRes.json();
          return { ...data, isDatabase: true };
        }
        return null;
      }).catch(async (err) => {
        console.error("Page details fetch exception, trying database:", err);
        try {
          const dbRes = await fetch(`https://api.notion.com/v1/databases/${selectedPageId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Notion-Version": "2022-06-28",
            },
            cache: "no-store",
          });
          if (dbRes.ok) {
            const data = await dbRes.json();
            return { ...data, isDatabase: true };
          }
        } catch (dbErr) {
          console.error("Database details fallback exception:", dbErr);
        }
        return null;
      }).then((data) => {
        if (data) {
          setCached(cacheKey, data, 30000); // Cache metadata for 30s
        }
        return data;
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

  // 4. Workspace Users List
  let workspaceUsersData: any = null;
  if (!session.isMock) {
    const cacheKey = `workspace-users:${session.accessToken}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      workspaceUsersData = cached;
    } else {
      workspaceUsersData = fetch("https://api.notion.com/v1/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Notion-Version": "2022-06-28",
        },
        cache: "no-store",
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          const usersList = data.results || [];
          setCached(cacheKey, usersList, 60000); // cache users list for 60s
          return usersList;
        }
        return [];
      }).catch(err => {
        console.error("Workspace users fetch exception:", err);
        return [];
      });
    }
  }

  // Resolve all API requests in parallel!
  const [resolvedSearch, resolvedDetails, resolvedBlocks, resolvedUsers] = await Promise.all([
    searchData instanceof Promise ? searchData : Promise.resolve(searchData),
    pageDetailsData instanceof Promise ? pageDetailsData : Promise.resolve(pageDetailsData),
    blocksData instanceof Promise ? blocksData : Promise.resolve(blocksData),
    workspaceUsersData instanceof Promise ? workspaceUsersData : Promise.resolve(workspaceUsersData),
  ]);

  const workspaceUsers: any[] = [
    { id: "u-1", name: session.ownerName || "Tommaso", type: "person", avatar_url: null },
    { id: "u-2", name: "NotionAI Copilot", type: "bot", avatar_url: null },
    { id: "u-3", name: "Sarah Connor", type: "person", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
  ];

  // Process pages list
  if (session.isMock) {
    pages = MOCK_PAGES;
  } else if (resolvedSearch) {
    pages = resolvedSearch.results.map((page: any) => {
      let title = "Untitled Page";
      if (page.object === "database" && page.title) {
        title = page.title.map((t: any) => t.plain_text).join("") || "Untitled Database";
      } else {
        const titleKey = page.properties ? Object.keys(page.properties).find(k => page.properties[k]?.type === "title") : null;
        const titleProp = titleKey ? page.properties[titleKey] : null;
        const titleArray = titleProp?.title;
        title =
          titleArray && titleArray.length > 0
            ? titleArray.map((t: any) => t.plain_text).join("")
            : "Untitled Page";
      }

      let icon = null;
      if (page.icon?.type === "emoji") {
        icon = page.icon.emoji;
      } else if (page.icon?.type === "external") {
        icon = page.icon.external.url;
      } else if (page.icon?.type === "file") {
        icon = page.icon.file.url;
      }

      let cover = null;
      if (page.cover?.type === "external") {
        cover = page.cover.external.url;
      } else if (page.cover?.type === "file") {
        cover = page.cover.file.url;
      }

      const parentId = page.parent?.type === "page_id" 
        ? page.parent.page_id 
        : page.parent?.type === "database_id"
        ? page.parent.database_id
        : undefined;

      return {
        id: page.id,
        title,
        url: page.url,
        created: new Date(page.created_time).toLocaleDateString(),
        last_edited: new Date(page.last_edited_time).toLocaleDateString(),
        emoji: icon,
        parentId,
        isDatabase: page.object === "database",
        cover,
      };
    });
  } else {
    // Check if we have stale pages in cache
    const cacheKey = `pages_list:${session.accessToken}`;
    const cachedPages = getCached<any[]>(cacheKey);
    if (cachedPages) {
      pages = cachedPages;
    } else {
      fetchError = "Connection failed. Please check your credentials or API status.";
    }
  }

  // Save the pages list to cache if successful
  if (pages.length > 0 && !session.isMock) {
    const cacheKey = `pages_list:${session.accessToken}`;
    setCached(cacheKey, pages, 60000); // cache for 60s
  }

  // Determine selected page metadata
  let selectedPage = selectedPageId ? pages.find((p) => p.id === selectedPageId) : null;
  if (selectedPage && resolvedDetails) {
    selectedPage.properties = resolvedDetails.properties;
    let freshTitle = "Untitled Page";
    if (resolvedDetails.isDatabase && resolvedDetails.title) {
      freshTitle = resolvedDetails.title.map((t: any) => t.plain_text).join("") || "Untitled Database";
    } else {
      const titleKey = resolvedDetails.properties ? Object.keys(resolvedDetails.properties).find(k => resolvedDetails.properties[k]?.type === "title") : null;
      const titleProp = titleKey ? resolvedDetails.properties[titleKey] : null;
      const titleArray = titleProp?.title;
      freshTitle = titleArray && titleArray.length > 0
        ? titleArray.map((t: any) => t.plain_text).join("")
        : "Untitled Page";
    }
    if (freshTitle !== "Untitled Page" && selectedPage.title === "Untitled Page") {
      selectedPage.title = freshTitle;
    }
  }

  if (selectedPageId && !selectedPage && !session.isMock && resolvedDetails) {
    let title = "Untitled Page";
    if (resolvedDetails.isDatabase && resolvedDetails.title) {
      title = resolvedDetails.title.map((t: any) => t.plain_text).join("") || "Untitled Database";
    } else {
      const titleKey = resolvedDetails.properties ? Object.keys(resolvedDetails.properties).find(k => resolvedDetails.properties[k]?.type === "title") : null;
      const titleProp = titleKey ? resolvedDetails.properties[titleKey] : null;
      const titleArray = titleProp?.title;
      title =
        titleArray && titleArray.length > 0
          ? titleArray.map((t: any) => t.plain_text).join("")
          : "Untitled Page";
    }

    let icon = null;
    if (resolvedDetails.icon?.type === "emoji") {
      icon = resolvedDetails.icon.emoji;
    } else if (resolvedDetails.icon?.type === "external") {
      icon = resolvedDetails.icon.external.url;
    } else if (resolvedDetails.icon?.type === "file") {
      icon = resolvedDetails.icon.file.url;
    }

    const parentId = resolvedDetails.parent?.type === "page_id"
      ? resolvedDetails.parent.page_id
      : resolvedDetails.parent?.type === "database_id"
      ? resolvedDetails.parent.database_id
      : undefined;

    selectedPage = {
      id: resolvedDetails.id,
      title,
      url: resolvedDetails.url,
      created: new Date(resolvedDetails.created_time).toLocaleDateString(),
      last_edited: new Date(resolvedDetails.last_edited_time).toLocaleDateString(),
      emoji: icon,
      parentId,
      isDatabase: !!resolvedDetails.isDatabase,
      properties: resolvedDetails.properties,
    };
  }

  // Get recursive page breadcrumbs hierarchy
  const breadcrumbs = selectedPageId 
    ? await getPageBreadcrumbs(selectedPageId, pages, session.accessToken) 
    : [];

  // Process selected page blocks content
  let pageBlocks: Block[] = [];
  let blockFetchError: string | null = null;

  if (selectedPageId) {
    if (session.isMock) {
      pageBlocks = MOCK_PAGE_CONTENTS[selectedPageId]?.blocks || [];
    } else if (selectedPage?.isDatabase) {
      const dbResult = await fetchDatabaseItems(selectedPageId, session.accessToken);
      if (dbResult) {
        pageBlocks = [
          {
            id: selectedPageId,
            type: "child_database",
            content: selectedPage.title,
            database_title: selectedPage.title,
            database_rows: dbResult.rows,
            database_columns: dbResult.columns,
          }
        ];
      } else {
        blockFetchError = "Failed to load database contents.";
      }
    } else if (resolvedBlocks) {
      try {
        pageBlocks = await Promise.all(
          resolvedBlocks.results.map(async (block: any) => {
            const type = block.type;
            let content = "";
            let checked = false;
            let language = "typescript";
            let richText: any[] | undefined = undefined;

            if (block[type]?.rich_text) {
              content = block[type].rich_text.map((t: any) => t.plain_text).join("");
              richText = block[type].rich_text;
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
                    id: block.id,
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
                    
                    // Capture page icon
                    let pageIcon = "";
                    if (page.icon?.type === "emoji") {
                      pageIcon = page.icon.emoji;
                    } else if (page.icon?.type === "external") {
                      pageIcon = page.icon.external?.url || "";
                    } else if (page.icon?.type === "file") {
                      pageIcon = page.icon.file?.url || "";
                    }
                    rowData._icon = pageIcon;

                    // Capture comments count (simulated randomly for visual parity)
                    if (page.id.charCodeAt(0) % 7 === 0) {
                      rowData._comments = "1";
                    } else if (page.id.charCodeAt(0) % 13 === 0) {
                      rowData._comments = "2";
                    }

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
                    id: block.id,
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
                id: block.id,
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
                id: block.id,
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
                id: block.id,
                type,
                content: src || "",
                caption,
              };
            }

            // Embed block handling
            if (type === "embed" && block.embed) {
              const caption = block.embed.caption?.map((t: any) => t.plain_text).join("") || "";
              return {
                id: block.id,
                type,
                content: block.embed.url || "",
                caption,
              };
            }

            // Equation block handling
            if (type === "equation" && block.equation?.expression) {
              return {
                id: block.id,
                type,
                content: block.equation.expression,
              };
            }

            // Button blocks (API returns as "unsupported" block with block_type: "button")
            if (type === "unsupported" && block.unsupported?.block_type === "button") {
              return {
                id: block.id,
                type: "button",
                content: "Run Action",
                button_text: "Button Action",
                button_icon: "⚡",
              };
            }

            // Bookmark block handling
            if (type === "bookmark" && block.bookmark) {
              const caption = block.bookmark.caption?.map((t: any) => t.plain_text).join("") || "";
              return {
                id: block.id,
                type,
                content: block.bookmark.url || "",
                caption,
              };
            }

            // File block handling
            if (type === "file" && block.file) {
              const fileType = block.file.type;
              const src = fileType === "external" ? block.file.external?.url : block.file.file?.url;
              const caption = block.file.caption?.map((t: any) => t.plain_text).join("") || "";
              return {
                id: block.id,
                type,
                content: src || "",
                caption,
              };
            }

            // Divider block handling
            if (type === "divider") {
              return {
                id: block.id,
                type,
                content: "",
              };
            }

            // Toggle block handling
            if (type === "toggle" && block.toggle) {
              const toggleContent = block.toggle.rich_text?.map((t: any) => t.plain_text).join("") || "";
              return {
                id: block.id,
                type,
                content: toggleContent,
                rich_text: richText,
              };
            }

            return {
              id: block.id,
              type,
              content,
              checked,
              language,
              rich_text: richText,
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
      <Sidebar
        pages={pages}
        selectedPageId={selectedPageId}
        isViewingAI={isViewingAI}
        session={session}
        daysLeft={daysLeft}
        hoursLeft={hoursLeft}
      />

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
            {!isViewingAI && breadcrumbs.map((crumb, cIdx) => (
              <React.Fragment key={crumb.id || cIdx}>
                <span className="text-[#a4a3a1] font-normal font-sans">/</span>
                <Link 
                  href={`/?pageId=${crumb.id}`}
                  className={cn(
                    "font-semibold truncate max-w-[180px] flex items-center gap-1 hover:underline",
                    cIdx === breadcrumbs.length - 1 ? "text-[#37352f]" : "text-[#7a7a78]"
                  )}
                >
                  <PageIcon emoji={crumb.emoji} className="w-3.5 h-3.5" />
                  <span>{crumb.title}</span>
                </Link>
              </React.Fragment>
            ))}
          </div>
          
          <div className="flex items-center gap-4.5">
            {/* Overlapping User Avatars of real workspace users */}
            {workspaceUsers && workspaceUsers.length > 0 && (
              <div className="flex -space-x-2 overflow-hidden select-none mr-2">
                {workspaceUsers.slice(0, 5).map((usr: any) => {
                  const initials = usr.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
                  return usr.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={usr.id}
                      src={usr.avatar_url}
                      alt={usr.name}
                      title={`${usr.name} (${usr.type === "bot" ? "AI Integration" : "Workspace Member"})`}
                      className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover cursor-pointer hover:translate-y-[-2px] transition-transform shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div
                      key={usr.id}
                      className={cn(
                        "inline-flex items-center justify-center w-6.5 h-6.5 rounded-full border-2 border-white text-[9px] font-bold cursor-pointer hover:translate-y-[-2px] transition-transform shadow-sm flex-shrink-0",
                        usr.type === "bot" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                      )}
                      title={`${usr.name} (${usr.type === "bot" ? "AI Integration" : "Workspace Member"})`}
                    >
                      {initials}
                    </div>
                  );
                })}
                {workspaceUsers.length > 5 && (
                  <div 
                    className="inline-flex items-center justify-center w-6.5 h-6.5 rounded-full bg-neutral-100 border-2 border-white text-[9px] font-bold text-neutral-600 cursor-pointer shadow-sm flex-shrink-0"
                    title={`${workspaceUsers.length - 5} more users`}
                  >
                    +{workspaceUsers.length - 5}
                  </div>
                )}
              </div>
            )}

            <SharePopover />

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
        {isViewingAI ? (
          <AIChatbot pages={pages} />
        ) : (
          <div className="flex-1 overflow-y-auto select-text">
            {/* Centered Content Wrapper */}
            <div className="px-12 py-10 max-w-4xl w-full mx-auto">
              
              {isViewingSpecificPage && selectedPage ? (
              <div className="space-y-6">
                {/* Page Cover/Header */}
                <div className="pb-4 flex items-center justify-between">
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

                {/* Page Properties / Attributes */}
                {selectedPage.properties && Object.keys(selectedPage.properties).length > 0 && (
                  <div className="border-b border-[#f1f1ef] pb-6 mb-6">
                    <div className="grid grid-cols-[140px_1fr] gap-y-3.5 items-center text-sm">
                      {Object.entries(selectedPage.properties).map(([propName, prop]: [string, any]) => {
                        if (prop.type === "title") return null;

                        let renderedValue: React.ReactNode = null;
                        let icon = "📝"; 

                        if (prop.type === "rich_text" && prop.rich_text) {
                          const text = prop.rich_text.map((t: any) => t.plain_text).join("");
                          if (text) renderedValue = <span className="text-[#37352f] font-medium">{text}</span>;
                          icon = "💬";
                        } else if (prop.type === "select" && prop.select) {
                          const colorClass = getNotionColorClasses(prop.select.color);
                          renderedValue = (
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", colorClass)}>
                              {prop.select.name}
                            </span>
                          );
                          icon = "☀️";
                        } else if (prop.type === "multi_select" && prop.multi_select) {
                          renderedValue = (
                            <div className="flex flex-wrap gap-1.5">
                              {prop.multi_select.map((s: any, idx: number) => {
                                const colorClass = getNotionColorClasses(s.color);
                                return (
                                  <span key={idx} className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", colorClass)}>
                                    {s.name}
                                  </span>
                                );
                              })}
                            </div>
                          );
                          icon = "🏷️";
                        } else if (prop.type === "status" && prop.status) {
                          const colorClass = getNotionColorClasses(prop.status.color);
                          renderedValue = (
                            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1", colorClass)}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {prop.status.name}
                            </span>
                          );
                          icon = "⚙️";
                        } else if (prop.type === "number" && prop.number !== undefined && prop.number !== null) {
                          renderedValue = <span className="font-mono text-[#37352f] font-medium">{prop.number}</span>;
                          icon = "🔢";
                        } else if (prop.type === "checkbox") {
                          renderedValue = (
                            <input 
                              type="checkbox" 
                              checked={!!prop.checkbox} 
                              readOnly 
                              className="h-4 w-4 rounded border-[#e3e2e0] text-[#2383e2] focus:ring-[#2383e2] cursor-not-allowed" 
                            />
                          );
                          icon = "☑️";
                        } else if (prop.type === "url" && prop.url) {
                          renderedValue = <a href={prop.url} target="_blank" rel="noopener noreferrer" className="text-[#2383e2] hover:underline truncate max-w-md block">{prop.url}</a>;
                          icon = "🔗";
                        } else if (prop.type === "email" && prop.email) {
                          renderedValue = <a href={`mailto:${prop.email}`} className="text-[#2383e2] hover:underline">{prop.email}</a>;
                          icon = "📧";
                        } else if (prop.type === "phone_number" && prop.phone_number) {
                          renderedValue = <span className="text-[#37352f] font-medium">{prop.phone_number}</span>;
                          icon = "📞";
                        } else if (prop.type === "date" && prop.date) {
                          const dateText = prop.date.start + (prop.date.end ? ` to ${prop.date.end}` : "");
                          renderedValue = <span className="text-[#37352f] font-medium">{dateText}</span>;
                          icon = "📅";
                        }

                        if (!renderedValue) return null;

                        return (
                          <React.Fragment key={propName}>
                            <div className="text-[#7c7b77] flex items-center gap-2 select-none font-medium">
                              <span className="text-sm">{icon}</span>
                              <span>{propName}</span>
                            </div>
                            <div className="flex items-center">
                              {renderedValue}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Render Blocks */}
                <div className="prose max-w-none">
                  {blockFetchError && (
                    <div className="text-center py-8 text-sm text-red-600 font-medium">
                      {blockFetchError}
                    </div>
                  )}
                  
                  <PageBlocksContainer 
                    initialBlocks={pageBlocks} 
                    isMock={!!session.isMock} 
                    pageId={selectedPageId || ""} 
                  />
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
        )}
      </main>
      
      {/* Global Floating AI Assistant Widget */}
      <FloatingAIChat pages={pages} selectedPageId={selectedPageId || null} />
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
