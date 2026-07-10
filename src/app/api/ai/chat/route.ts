import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { structuredOutput, type ChatMessage } from "@/lib/openrouter";

interface BlockEditInstruction {
  block_id: string;
  block_type: string;
  action: "update" | "delete" | "insert_after";
  original_content: string;
  new_content: string;
}

interface AIChatResponse {
  isModification: boolean;
  answer?: string;
  rationale?: string;
  instructions?: BlockEditInstruction[];
}

// Fetch all blocks from a Notion page (flattened with IDs)
async function fetchPageBlocks(pageId: string, accessToken: string) {
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const blocks: Array<{
      id: string;
      type: string;
      content: string;
      index: number;
    }> = [];

    for (let i = 0; i < data.results.length; i++) {
      const block = data.results[i];
      const type = block.type;
      let content = "";

      if (block[type]?.rich_text) {
        content = block[type].rich_text.map((t: any) => t.plain_text).join("");
      }

      // For table rows, fetch cell contents
      if (type === "table") {
        try {
          const rowRes = await fetch(`https://api.notion.com/v1/blocks/${block.id}/children`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Notion-Version": "2022-06-28",
            },
          });
          if (rowRes.ok) {
            const rowData = await rowRes.json();
            for (let j = 0; j < rowData.results.length; j++) {
              const row = rowData.results[j];
              if (row.type === "table_row" && row.table_row?.cells) {
                const cellTexts = row.table_row.cells
                  .map((cell: any[]) => cell.map((t: any) => t.plain_text).join(""))
                  .join(" | ");
                blocks.push({
                  id: row.id,
                  type: "table_row",
                  content: cellTexts,
                  index: blocks.length,
                });
              }
            }
            continue;
          }
        } catch (e) {
          console.error("Error fetching table rows:", e);
        }
      }

      blocks.push({
        id: block.id,
        type,
        content,
        index: i,
      });
    }

    return blocks;
  } catch (e) {
    return [];
  }
}

// Fetch page list for search context
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

    // Step 1: Fetch active page blocks if selected
    const blocks = selectedPageId ? await fetchPageBlocks(selectedPageId, session.accessToken) : [];
    const workspacePages = !session.isMock ? await fetchWorkspacePages(session.accessToken) : [];

    // Step 2: Build the system prompt instructing the LLM to classify and output JSON
    let systemContext = `You are a helpful Notion AI workspace assistant named Notion AI Copilot. The user is currently chatting with you.
You have access to the user's workspace pages and the current active page content (if selected).

Your job is to decide whether the user's latest query is a request to EDIT, MODIFY, REWRITE, ADD, or DELETE contents on the current active page, or if it is just a conversational question.

You MUST respond with valid JSON matching this exact schema:
{
  "isModification": true or false,
  "answer": "your conversational text reply here (only required if isModification is false)",
  "rationale": "explanation of edits (only required if isModification is true)",
  "instructions": [
    {
      "block_id": "the block id from the list",
      "block_type": "the block type",
      "action": "update" or "delete" or "insert_after",
      "original_content": "the current text content of the block",
      "new_content": "the new text content (empty string for delete)"
    }
  ]
}

Rules for Page Edits (when isModification is true):
- ONLY modify blocks that are directly relevant to the user's request
- Keep changes minimal and targeted
- Preserve block IDs exactly as given
- For table_row blocks, format cell content as "cell1 | cell2 | cell3"
- If the user asks to modify only specific parts or sections (e.g. "ultima parte", "first 10 rows"), only target those blocks
- Return isModification: false if no page is selected but they ask for an edit (and explain why in the answer).
- If the user query is just general conversation or a question about the page contents (without wanting to change them), set isModification: false and explain the answer.
`;

    if (workspacePages.length > 0) {
      systemContext += `\nWorkspace Pages available:\n${workspacePages.map((p) => `- ${p.title} (ID: ${p.id})`).join("\n")}\n`;
    }

    if (blocks.length > 0) {
      systemContext += `\nActive Page Content Blocks:\n${blocks.map((b) => `[${b.index}] id="${b.id}" type="${b.type}" content="${b.content}"`).join("\n")}\n`;
    }

    const formattedMessages: ChatMessage[] = [
      { role: "system" as const, content: systemContext },
      ...messages.map((m: any) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    const model = "inclusionai/ling-2.6-flash";
    const result = await structuredOutput<AIChatResponse>(formattedMessages, {}, {
      temperature: 0.15,
      model,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Chat API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
  }
}
