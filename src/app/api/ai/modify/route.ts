import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { structuredOutput, chatCompletion, type ChatMessage } from "@/lib/openrouter";

export interface BlockEditInstruction {
  block_id: string;
  block_type: string;
  action: "update" | "delete" | "insert_after";
  original_content: string;
  new_content: string;
}

export interface AIEditsResponse {
  rationale: string;
  instructions: BlockEditInstruction[];
}

// Fetch all blocks from a Notion page (flattened with IDs)
async function fetchPageBlocks(pageId: string, accessToken: string) {
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
    },
  });

  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status}`);
  }

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

    // For table rows, fetch children
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
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pageId, query } = body;

    if (!pageId || !query) {
      return NextResponse.json(
        { error: "Missing pageId or query" },
        { status: 400 }
      );
    }

    // Step 1: Fetch all blocks from the page
    const blocks = await fetchPageBlocks(pageId, session.accessToken);

    if (blocks.length === 0) {
      return NextResponse.json(
        { error: "No blocks found on this page" },
        { status: 404 }
      );
    }

    // Step 2: Build the prompt with block context
    const blockSummary = blocks
      .map((b) => `[${b.index}] id="${b.id}" type="${b.type}" content="${b.content}"`)
      .join("\n");

    const systemPrompt = `You are a Notion page editor AI. You receive a list of content blocks from a Notion page, each with an id, type, and text content. The user will ask you to modify the page.

You MUST respond with valid JSON matching this exact schema:
{
  "rationale": "Brief explanation of what changes you're making and why",
  "instructions": [
    {
      "block_id": "the exact block id from the list",
      "block_type": "the block type (paragraph, heading_1, table_row, etc.)",
      "action": "update" or "delete" or "insert_after",
      "original_content": "the current text content of the block",
      "new_content": "the new text content (empty string for delete)"
    }
  ]
}

Rules:
- ONLY modify blocks that are relevant to the user's request
- Keep changes minimal and targeted
- Preserve block IDs exactly as given
- For table_row blocks, format cell content as "cell1 | cell2 | cell3"
- If the user asks to modify only specific rows (e.g. "first 10 rows") only include those rows
- Never modify blocks that don't need changes
- Return an empty instructions array if no changes are needed`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here are the blocks on the page:\n\n${blockSummary}\n\nUser request: ${query}`,
      },
    ];

    // Step 3: Call OpenRouter for structured output
    const result = await structuredOutput<AIEditsResponse>(messages, {}, {
      temperature: 0.15,
      model: "openai/gpt-4o-mini",
    });

    return NextResponse.json({
      rationale: result.rationale || "Changes prepared.",
      instructions: result.instructions || [],
      totalBlocks: blocks.length,
    });
  } catch (error: any) {
    console.error("AI modify error:", error);
    return NextResponse.json(
      { error: error.message || "AI processing failed" },
      { status: 500 }
    );
  }
}
