import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCached, setCached } from "@/lib/cache";
import { MOCK_PAGES } from "@/lib/mockData";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const { blockId } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `api-blocks:${blockId}`;
  const cached = getCached<any>(cacheKey);
  if (cached) {
    if (cached && typeof cached === "object" && "blocks" in cached) {
      return NextResponse.json(cached);
    }
    return NextResponse.json({ blocks: cached });
  }

  // If mock session, return sample mock children blocks based on mock database page items
  if (session.isMock) {
    const page = MOCK_PAGES.find((p) => p.id === blockId);
    const properties = page?.properties || {};
    return NextResponse.json({
      properties,
      blocks: [
        { type: "heading_1", content: "📖 Class Notes Overview" },
        { type: "paragraph", content: "This is a detailed page containing study guides, homework assignments, and practice code exercises." },
        { type: "heading_2", content: "⚡ Action Item List" },
        { type: "to_do", content: "Read Chapters 4-5 of the textbooks", checked: false },
        { type: "to_do", content: "Prepare presentation slides", checked: true },
        {
          type: "code",
          content: `// Sample Code snippet\nfunction calculateGrade(score) {\n  return score >= 60 ? "Pass" : "Fail";\n}`,
          language: "javascript"
        }
      ]
    });
  }

  try {
    const [childrenRes, pageRes] = await Promise.allSettled([
      fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Notion-Version": "2022-06-28",
        },
        cache: "no-store",
      }),
      fetch(`https://api.notion.com/v1/pages/${blockId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Notion-Version": "2022-06-28",
        },
        cache: "no-store",
      })
    ]);

    let properties = {};
    if (pageRes.status === "fulfilled" && pageRes.value.ok) {
      const pageData = await pageRes.value.json();
      properties = pageData.properties || {};
    }

    if (childrenRes.status === "rejected" || !childrenRes.value.ok) {
      return NextResponse.json({
        properties,
        blocks: []
      });
    }

    const res = childrenRes.value;

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from Notion: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const blocks = await Promise.all(
      data.results.map(async (block: any) => {
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

        // Support simple tables
        if (type === "table") {
          try {
            const rowRes = await fetch(`https://api.notion.com/v1/blocks/${block.id}/children`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Notion-Version": "2022-06-28",
              },
              cache: "no-store",
            });
            if (rowRes.ok) {
              const rowData = await rowRes.json();
              const rows = rowData.results.map((rowBlock: any) => {
                if (rowBlock.type === "table_row" && rowBlock.table_row?.cells) {
                  return {
                    id: rowBlock.id,
                    cells: rowBlock.table_row.cells
                  };
                }
                return null;
              }).filter(Boolean);
              return {
                type,
                content: "",
                rows,
                table_width: block.table.table_width,
                has_column_header: block.table.has_column_header,
              };
            }
          } catch (e) {
            console.error("Error loading table rows in API:", e);
          }
        }

        // Support child database
        if (type === "child_database") {
          try {
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
              const dbData = await dbRes.json();
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
          } catch (e) {
            console.error("Error loading database in API:", e);
          }
        }

        // Support images
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

        // Support videos
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

        // Support buttons
        if (type === "unsupported" && block.unsupported?.block_type === "button") {
          return {
            type: "button",
            content: "Run Action",
            button_text: "Button Action",
            button_icon: "⚡",
          };
        }

        // Support pdf
        if (type === "pdf" && block.pdf) {
          const pdfType = block.pdf.type;
          const src = pdfType === "external" ? block.pdf.external?.url : block.pdf.file?.url;
          const caption = block.pdf.caption?.map((t: any) => t.plain_text).join("") || "";
          return {
            type,
            content: src || "",
            caption,
          };
        }

        // Support embed
        if (type === "embed" && block.embed) {
          const caption = block.embed.caption?.map((t: any) => t.plain_text).join("") || "";
          return {
            type,
            content: block.embed.url || "",
            caption,
          };
        }

        // Support bookmark
        if (type === "bookmark" && block.bookmark) {
          const caption = block.bookmark.caption?.map((t: any) => t.plain_text).join("") || "";
          return {
            type,
            content: block.bookmark.url || "",
            caption,
          };
        }

        // Support file
        if (type === "file" && block.file) {
          const fileType = block.file.type;
          const src = fileType === "external" ? block.file.external?.url : block.file.file?.url;
          const caption = block.file.caption?.map((t: any) => t.plain_text).join("") || "";
          return {
            type,
            content: src || "",
            caption,
          };
        }

        // Support divider
        if (type === "divider") {
          return {
            type: "divider",
            content: "",
          };
        }

        // Support toggle
        if (type === "toggle" && block.toggle) {
          const toggleContent = block.toggle.rich_text?.map((t: any) => t.plain_text).join("") || "";
          return {
            type: "toggle",
            content: toggleContent,
          };
        }

        return {
          type,
          content,
          checked,
          language,
          rich_text: richText,
        };
      })
    );

    const result = { blocks, properties };
    setCached(cacheKey, result, 10000); // cache blocks list and properties for 10 seconds
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching dynamic blocks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load blocks" },
      { status: 500 }
    );
  }
}
