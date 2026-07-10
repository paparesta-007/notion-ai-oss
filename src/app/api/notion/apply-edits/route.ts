import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface EditInstruction {
  block_id: string;
  block_type: string;
  action: "update" | "delete" | "insert_after";
  original_content: string;
  new_content: string;
}

function buildRichText(text: string) {
  return [{ type: "text", text: { content: text } }];
}

function buildBlockPatchBody(instruction: EditInstruction) {
  const { block_type, new_content } = instruction;

  // Table row: split by " | " into cells
  if (block_type === "table_row") {
    const cells = new_content.split(" | ").map((cellText) => buildRichText(cellText.trim()));
    return { table_row: { cells } };
  }

  // Text-based blocks (paragraph, heading, to_do, bulleted_list_item, etc.)
  const textBlockTypes = [
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "bulleted_list_item",
    "numbered_list_item",
    "quote",
    "callout",
    "toggle",
  ];

  if (textBlockTypes.includes(block_type)) {
    return {
      [block_type]: {
        rich_text: buildRichText(new_content),
      },
    };
  }

  // To-do blocks
  if (block_type === "to_do") {
    return {
      to_do: {
        rich_text: buildRichText(new_content),
      },
    };
  }

  // Code blocks
  if (block_type === "code") {
    return {
      code: {
        rich_text: buildRichText(new_content),
      },
    };
  }

  // Fallback: treat as paragraph
  return {
    paragraph: {
      rich_text: buildRichText(new_content),
    },
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.isMock) {
    // In mock mode, pretend the edits succeeded
    return NextResponse.json({
      success: true,
      applied: 0,
      message: "Mock mode: no actual changes applied.",
    });
  }

  try {
    const body = await request.json();
    const { instructions } = body as { instructions: EditInstruction[] };

    if (!instructions || instructions.length === 0) {
      return NextResponse.json(
        { error: "No instructions provided" },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      instructions.map(async (instruction) => {
        if (instruction.action === "delete") {
          // DELETE block
          const res = await fetch(
            `https://api.notion.com/v1/blocks/${instruction.block_id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Notion-Version": "2022-06-28",
              },
            }
          );
          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`DELETE failed for ${instruction.block_id}: ${res.status} ${errBody}`);
          }
          return { block_id: instruction.block_id, action: "deleted" };
        }

        if (instruction.action === "update") {
          // PATCH block
          const patchBody = buildBlockPatchBody(instruction);
          const res = await fetch(
            `https://api.notion.com/v1/blocks/${instruction.block_id}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(patchBody),
            }
          );
          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`PATCH failed for ${instruction.block_id}: ${res.status} ${errBody}`);
          }
          return { block_id: instruction.block_id, action: "updated" };
        }

        // insert_after is more complex - skip for now
        return { block_id: instruction.block_id, action: "skipped" };
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    return NextResponse.json({
      success: failed.length === 0,
      applied: succeeded,
      failed: failed.length,
      errors: failed.map((f) =>
        f.status === "rejected" ? (f.reason as Error).message : ""
      ),
    });
  } catch (error: any) {
    console.error("Apply edits error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply edits" },
      { status: 500 }
    );
  }
}
