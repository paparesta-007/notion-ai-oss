import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCached, setCached } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";

  // Mock pages list for sandbox session fallback
  const MOCK_PAGES = [
    { id: "mock-1", title: "Project Brainstorming & Mindmap", url: "https://notion.so", created: "2 days ago", last_edited: "2 hours ago", emoji: "💡" },
    { id: "mock-2", title: "Product Launch Roadmap v2.0", url: "https://notion.so", created: "1 week ago", last_edited: "Yesterday", emoji: "🚀" },
    { id: "mock-3", title: "Notion AI Integration Specifications", url: "https://notion.so", created: "2 weeks ago", last_edited: "3 days ago", emoji: null },
    { id: "mock-4", title: "Team Weekly Standup Sync Notes", url: "https://notion.so", created: "3 days ago", last_edited: "5 mins ago", emoji: "🎯" },
    { id: "mock-5", title: "Marketing Copy & Creative Direction", url: "https://notion.so", created: "1 month ago", last_edited: "1 week ago", emoji: "✍️" },
  ];

  if (session.isMock) {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      return NextResponse.json({ pages: MOCK_PAGES });
    }
    const filtered = MOCK_PAGES.filter(p => p.title.toLowerCase().includes(cleanQuery));
    return NextResponse.json({ pages: filtered });
  }

  const cacheKey = `search-query:${session.accessToken}:${query}`;
  const cached = getCached<any>(cacheKey);
  if (cached) {
    return NextResponse.json({ pages: cached });
  }

  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.trim(),
        filter: {
          property: "object",
          value: "page",
        },
        page_size: 5, // Return top 5 most relevant matches from Notion
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Notion search error: ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();
    const pages = data.results.map((page: any) => {
      const titleKey = page.properties ? Object.keys(page.properties).find(k => page.properties[k]?.type === "title") : null;
      const titleProp = titleKey ? page.properties[titleKey] : null;
      const titleArray = titleProp?.title;
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

    setCached(cacheKey, pages, 15000); // cache search queries for 15s
    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error("Error in Notion search query API:", error);
    return NextResponse.json({ error: error.message || "Search query failed" }, { status: 500 });
  }
}
