import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { chatCompletion, type ChatMessage } from "@/lib/openrouter";

// Helper to fetch pages for context
async function fetchWorkspacePages(accessToken: string): Promise<any[]> {
  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "object", value: "page" },
        page_size: 15,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results.map((p: any) => {
      const titleProp = p.properties?.title || p.properties?.Name || p.properties?.name;
      const title = titleProp?.title?.[0]?.plain_text || "Untitled Page";
      return { id: p.id, title, url: p.url };
    });
  } catch (e) {
    return [];
  }
}

// Helper to fetch current page block text content for context
async function fetchPageTextContent(pageId: string, accessToken: string): Promise<string> {
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=30`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.results
      .map((block: any) => {
        const type = block.type;
        if (block[type]?.rich_text) {
          return block[type].rich_text.map((t: any) => t.plain_text).join("");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  } catch (e) {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages, selectedPageId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Prepare system instructions with workspace and active page context
    let systemContext = "You are a helpful Notion AI workspace assistant named Notion AI Copilot (a friendly duck mascot).\n";

    if (!session.isMock) {
      const [pages, currentPageContent] = await Promise.all([
        fetchWorkspacePages(session.accessToken),
        selectedPageId ? fetchPageTextContent(selectedPageId, session.accessToken) : Promise.resolve(""),
      ]);

      if (pages.length > 0) {
        systemContext += `\nHere are the pages available in the workspace:\n${pages.map((p: any) => `- ${p.title} (ID: ${p.id})`).join("\n")}\n`;
      }
      if (currentPageContent) {
        systemContext += `\nHere is the text content of the active page that the user is currently viewing:\n"""\n${currentPageContent}\n"""\n`;
      }
    } else {
      systemContext += "\nWorkspace Context: Running in demo/mock mode with template pages like 'Gestione lavoro' and 'Materie'.";
    }

    systemContext += "\nBe concise, friendly, and structure answers clearly. If the user asks about the page contents or pages, reference this context.";

    const formattedMessages: ChatMessage[] = [
      { role: "system" as const, content: systemContext },
      ...messages.map((m: any) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    const model = "inclusionai/ling-2.6-flash";
    const answer = await chatCompletion(formattedMessages, { model, temperature: 0.7 });

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("AI Chat API error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate answer" }, { status: 500 });
  }
}
