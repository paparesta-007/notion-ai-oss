import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface BlockEditInstruction {
  block_id: string;
  block_type: string;
  action: "update" | "delete" | "insert_after";
  original_content: string;
  new_content: string;
}

// Helper to extract the "answer" property value from a streaming partial JSON string in real-time
function extractPartialAnswer(jsonText: string): string {
  const match = jsonText.match(/"answer"\s*:\s*"(.*)/);
  if (!match) return "";
  
  const remaining = match[1];
  let result = "";
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i] === '"' && remaining[i - 1] !== '\\') {
      break;
    }
    result += remaining[i];
  }
  
  return result
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

// Helper to extract the "rationale" property value from a streaming partial JSON string in real-time
function extractPartialRationale(jsonText: string): string {
  const match = jsonText.match(/"rationale"\s*:\s*"(.*)/);
  if (!match) return "";
  
  const remaining = match[1];
  let result = "";
  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i] === '"' && remaining[i - 1] !== '\\') {
      break;
    }
    result += remaining[i];
  }
  
  return result
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

// Parse Notion page properties into a list of key-value text representations
function parsePropertiesAsText(properties: any): string[] {
  const props: string[] = [];
  if (!properties) return props;

  for (const [propName, prop] of Object.entries(properties) as any) {
    if (prop.type === "title") {
      continue; // Skip title as it is used as the page heading
    }
    
    let val = "";
    if (prop.type === "rich_text" && prop.rich_text) {
      val = prop.rich_text.map((t: any) => t.plain_text).join("");
    } else if (prop.type === "select" && prop.select) {
      val = prop.select.name;
    } else if (prop.type === "multi_select" && prop.multi_select) {
      val = prop.multi_select.map((s: any) => s.name).join(", ");
    } else if (prop.type === "number" && prop.number !== undefined && prop.number !== null) {
      val = String(prop.number);
    } else if (prop.type === "date" && prop.date) {
      val = prop.date.start + (prop.date.end ? ` to ${prop.date.end}` : "");
    } else if (prop.type === "checkbox") {
      val = prop.checkbox ? "Yes" : "No";
    } else if (prop.type === "url" && prop.url) {
      val = prop.url;
    } else if (prop.type === "email" && prop.email) {
      val = prop.email;
    } else if (prop.type === "phone_number" && prop.phone_number) {
      val = prop.phone_number;
    } else if (prop.type === "status" && prop.status) {
      val = prop.status.name;
    } else if (prop.type === "people" && prop.people) {
      val = prop.people.map((p: any) => p.name || p.id).join(", ");
    } else if (prop.type === "relation" && prop.relation) {
      val = prop.relation.map((r: any) => r.id).join(", ");
    }
    
    if (val) {
      props.push(`${propName}: "${val}"`);
    }
  }
  return props;
}

// Fetch page children blocks recursively and format as markdown
async function fetchPageBlocksAsMarkdown(pageId: string, accessToken: string): Promise<string> {
  const blocks: string[] = [];
  try {
    let hasMore = true;
    let cursor: string | undefined = undefined;

    while (hasMore) {
      let url = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`;
      if (cursor) {
        url += `&start_cursor=${cursor}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2026-03-11",
        },
      });

      if (!res.ok) {
        break;
      }

      const data = await res.json();
      for (const block of data.results) {
        const type = block.type;
        let text = "";
        
        if (block[type]?.rich_text) {
          text = block[type].rich_text.map((t: any) => t.plain_text).join("");
        }

        if (type === "paragraph") {
          blocks.push(text);
        } else if (type === "heading_1") {
          blocks.push(`# ${text}`);
        } else if (type === "heading_2") {
          blocks.push(`## ${text}`);
        } else if (type === "heading_3") {
          blocks.push(`### ${text}`);
        } else if (type === "bulleted_list_item") {
          blocks.push(`* ${text}`);
        } else if (type === "numbered_list_item") {
          blocks.push(`1. ${text}`);
        } else if (type === "to_do") {
          const checked = block.to_do.checked ? "[x]" : "[ ]";
          blocks.push(`${checked} ${text}`);
        } else if (type === "code") {
          const codeText = block.code.rich_text?.map((t: any) => t.plain_text).join("") || "";
          const lang = block.code.language || "";
          blocks.push(`\`\`\`${lang}\n${codeText}\n\`\`\``);
        } else if (type === "quote") {
          blocks.push(`> ${text}`);
        } else if (type === "callout") {
          const emoji = block.callout.icon?.emoji || "💡";
          blocks.push(`> ${emoji} ${text}`);
        }
      }

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }
  } catch (err) {
    console.error("[AI AUDIT] Error in fetchPageBlocksAsMarkdown:", err);
  }

  return blocks.join("\n\n");
}

// Fetch database rows and return them as text with content previews
async function fetchDatabaseRowsAsText(databaseId: string, accessToken: string): Promise<string> {
  const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2026-03-11",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 30 }),
  });

  if (!dbRes.ok) return "";
  const dbData = await dbRes.json();

  const rows: string[] = [];
  for (const rowPage of dbData.results) {
    let rowTitle = "Untitled";
    const titleKey = rowPage.properties ? Object.keys(rowPage.properties).find(k => rowPage.properties[k]?.type === "title") : null;
    const titleProp = titleKey ? rowPage.properties[titleKey] : null;
    rowTitle = titleProp?.title?.map((t: any) => t.plain_text).join("") || rowTitle;

    const props = parsePropertiesAsText(rowPage.properties);

    let preview = "";
    try {
      const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${rowPage.id}/children?page_size=5`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2026-03-11",
        },
      });
      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        const firstTexts = blocksData.results
          .map((b: any) => {
            const type = b.type;
            if (b[type]?.rich_text) {
              return b[type].rich_text.map((t: any) => t.plain_text).join("");
            }
            return "";
          })
          .filter(Boolean);
        preview = firstTexts.join(" ").slice(0, 200).replace(/\n/g, " ");
      }
    } catch {}

    rows.push(`- "${rowTitle}" (ID: ${rowPage.id})${props.length ? ` [${props.join(", ")}]` : ""}${preview ? ` — Preview: "${preview}..."` : ""}`);
  }

  return `Database rows (${rows.length} entries):\n${rows.join("\n")}`;
}

// Fetch full page content as markdown in a single API call
async function fetchPageMarkdown(pageId: string, accessToken: string): Promise<string> {
  console.log(`[AI AUDIT] Fetching contents for page ID: ${pageId}`);
  try {
    // 1. Try to fetch as standard page first
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2026-03-11",
      },
    });

    if (pageRes.ok) {
      const pageData = await pageRes.json();
      
      let title = "Untitled Page";
      const titleKey = pageData.properties ? Object.keys(pageData.properties).find(k => pageData.properties[k]?.type === "title") : null;
      const titleProp = titleKey ? pageData.properties[titleKey] : null;
      title = titleProp?.title?.map((t: any) => t.plain_text).join("") || title;

      const attributes = parsePropertiesAsText(pageData.properties);
      const attributesSection = attributes.length > 0
        ? `**Attributes:**\n${attributes.map(a => `- ${a}`).join("\n")}\n\n---\n`
        : "";

      const bodyMarkdown = await fetchPageBlocksAsMarkdown(pageId, accessToken);
      const fullMarkdown = `# ${title}\n${attributesSection}\n${bodyMarkdown}`;
      
      const truncated = fullMarkdown.length > 4000
        ? fullMarkdown.slice(0, 4000) + "\n\n[... content truncated for brevity ...]"
        : fullMarkdown;
      return truncated;
    }

    // 2. If page fetch failed, try to query as a database
    console.log(`[AI AUDIT] Page fetch failed, trying database rows...`);
    const dbRowsText = await fetchDatabaseRowsAsText(pageId, accessToken);
    if (dbRowsText) {
      return dbRowsText;
    }

    return "No content found for this ID.";
  } catch (e) {
    console.error("[AI AUDIT] Error fetching page content:", e);
    return "";
  }
}

// Fetch page list for search context (with database objects included)
async function fetchWorkspacePages(accessToken: string): Promise<any[]> {
  console.log("[AI AUDIT] Fetching all workspace pages and databases from Notion Search API...");
  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2026-03-11",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    });
    if (!res.ok) {
      console.error(`[AI AUDIT] Notion search failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    const parsed = data.results.map((p: any) => {
      let title = "Untitled Page";
      if (p.object === "database" && p.title) {
        title = p.title.map((t: any) => t.plain_text).join("") || "Untitled Database";
      } else {
        const titleKey = p.properties ? Object.keys(p.properties).find(k => p.properties[k]?.type === "title") : null;
        const titleProp = titleKey ? p.properties[titleKey] : null;
        title = titleProp?.title?.[0]?.plain_text || "Untitled Page";
      }
      return { id: p.id, title, url: p.url, isDatabase: p.object === "database" };
    });
    console.log(`[AI AUDIT] Parsed ${parsed.length} pages/databases from workspace index.`);
    return parsed;
  } catch (e) {
    console.error("[AI AUDIT] Exception in fetchWorkspacePages:", e);
    return [];
  }
}

// Full text search call to Notion API matching keywords inside page titles AND text blocks content
async function searchNotionWorkspace(query: string, accessToken: string): Promise<any[]> {
  console.log(`[AI AUDIT] Executing full-text Notion search request for query: "${query}"`);
  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2026-03-11",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.trim(),
        page_size: 15,
      }),
    });

    if (!res.ok) {
      console.error(`[AI AUDIT] Full-text search failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const results = data.results.map((p: any) => {
      let title = "Untitled Page";
      if (p.object === "database" && p.title) {
        title = p.title.map((t: any) => t.plain_text).join("") || "Untitled Database";
      } else {
        const titleKey = p.properties ? Object.keys(p.properties).find(k => p.properties[k]?.type === "title") : null;
        const titleProp = titleKey ? p.properties[titleKey] : null;
        title = titleProp?.title?.[0]?.plain_text || "Untitled Page";
      }
      return { id: p.id, title, isDatabase: p.object === "database" };
    });

    console.log(`[AI AUDIT] Full-text search returned ${results.length} results:`, results);
    return results;
  } catch (e) {
    console.error("[AI AUDIT] Exception in searchNotionWorkspace full text search:", e);
    return [];
  }
}

// Stream reader for OpenRouter completions
async function fetchOpenRouterStream(
  messages: any[],
  apiKey: string,
  model: string,
  onChunk: (text: string) => void
): Promise<string> {
  console.log(`[AI AUDIT] Requesting stream from OpenRouter using model: ${model}`);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Notion AI Integration",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.15,
      response_format: { type: "json_object" },
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[AI AUDIT] OpenRouter error response: ${response.status} - ${errText}`);
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  if (!reader) throw new Error("No readable body response from OpenRouter");

  let fullContent = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine.startsWith("data: ")) continue;
      
      const dataStr = cleanLine.slice(6);
      if (dataStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(dataStr);
        const chunkText = parsed.choices?.[0]?.delta?.content || "";
        if (chunkText) {
          fullContent += chunkText;
          onChunk(fullContent);
        }
      } catch (e) {
        // ignore incomplete JSON chunks
      }
    }
  }
  
  console.log(`[AI AUDIT] Stream complete. Total content length: ${fullContent.length} chars.`);
  return fullContent;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    console.warn("[AI AUDIT] Unauthorized request attempt to AI chat endpoint.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages, selectedPageId, stream } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      console.warn("[AI AUDIT] Missing messages payload in request.");
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    console.log(`[AI AUDIT] POST request received. SelectedPageId: ${selectedPageId || "none"}. Streaming mode: ${stream ?? false}`);

    // Pre-fetch active page blocks if selected
    const activeMarkdown = selectedPageId ? await fetchPageMarkdown(selectedPageId, session.accessToken) : "";
    const workspacePages = !session.isMock ? await fetchWorkspacePages(session.accessToken) : [];

    // System prompt instructing the LLM on its identity, ReAct workflow, and structured JSON output
    let systemContext = `You are a helpful Notion AI workspace assistant named Notion AI Copilot. The user is currently chatting with you.
You have access to the user's workspace pages, and the current active page content (if selected).

You can perform multi-turn reasoning to answer user queries using tools.
To use a tool, you MUST return a JSON object with this format:
{
  "call_tool": "search_workspace",
  "arguments": { "query": "search query here" }
}
OR
{
  "call_tool": "fetch_page_content",
  "arguments": { "page_id": "page id here" }
}

You should call tools to look up relevant topics, search terms, database rows, or page contents that are not in the system prompt. For example, if the user asks "Where is page X?" or "Find Y", you should call search_workspace first, find the page id, then fetch_page_content, and then construct the final response.

IMPORTANT search strategy guidelines:
- The search_workspace tool only matches PAGE TITLES, not content inside pages.
- If searching for a topic (e.g. "globalizzazione") returns no results, the content might be inside a page with a different title (e.g. "Capitolo XV").
- When you find a database, fetch its content first — the result will include row titles, properties, AND content previews to help you identify the right page.
- After identifying the right row/page from a database, fetch that specific page to read its full content.
- Prefer searching with short, distinctive keywords rather than long phrases.

Once you have gathered all information and are ready to construct the final response to the user, you MUST return a JSON object matching this schema:
{
  "isModification": true or false,
  "answer": "your conversational text reply here (only required if isModification is false)",
  "rationale": "your step-by-step reasoning thought process, logic details, or edit explanations here (always provide this so the user knows your thoughts)",
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
- ONLY modify blocks that are directly relevant to the user's request.
- Use inline markdown formatting in \`new_content\` where appropriate: use backticks like \\\`code\\\` for inline code, commands, shortcuts, and \`**bold**\` for emphasis.
- Return isModification: false if they ask for an edit but no active page is selected (and explain why in the answer).
`;

    if (workspacePages.length > 0) {
      systemContext += `\nWorkspace Pages available:\n${workspacePages.map((p) => `- ${p.title} (ID: ${p.id}, isDatabase: ${p.isDatabase})`).join("\n")}\n`;
    }

    if (activeMarkdown) {
      systemContext += `\nActive Page Markdown Content:\n${activeMarkdown}\n`;
    }

    const currentMessages: any[] = [
      { role: "system", content: systemContext },
      ...messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const apiKey = process.env.OPENROUTER_API_KEY || "";
    const model = "inclusionai/ling-2.6-flash";

    // Streaming response setup
    if (stream === true) {
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          const safeEnqueue = (data: any) => {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch (err) {
              console.warn("[AI AUDIT] SSE Stream controller already closed, skipping enqueue.");
            }
          };

          const safeEnqueueRaw = (rawString: string) => {
            try {
              controller.enqueue(encoder.encode(rawString));
            } catch (err) {
              console.warn("[AI AUDIT] SSE Stream controller already closed, skipping enqueue raw.");
            }
          };

          const safeClose = () => {
            try {
              controller.close();
            } catch (err) {
              // Ignore already closed errors
            }
          };

          try {
            let finalChoiceContent = "";
            let taskCounter = 1;

            const MAX_TURNS = 6;
            for (let turn = 0; turn < MAX_TURNS; turn++) {
              console.log(`[AI AUDIT] Starting loop turn ${turn + 1}/${MAX_TURNS}`);

              if (turn === MAX_TURNS - 1) {
                currentMessages.push({
                  role: "user",
                  content: "IMPORTANT: This is your LAST turn. You MUST provide a final answer now. Do NOT call any more tools. Respond with the JSON answer format."
                });
              }
              let lastStreamedAnswer = "";
              let lastStreamedRationale = "";

              const content = await fetchOpenRouterStream(
                currentMessages,
                apiKey,
                model,
                (bufferedText) => {
                  // Stream reasoning logic and final text answers if the model is not calling a tool
                  if (!bufferedText.includes('"call_tool"')) {
                    // 1. Stream Rationale/Thoughts
                    const currentRationale = extractPartialRationale(bufferedText);
                    if (currentRationale && currentRationale !== lastStreamedRationale) {
                      const chunkToSend = currentRationale.slice(lastStreamedRationale.length);
                      lastStreamedRationale = currentRationale;
                      safeEnqueue({ rationale: chunkToSend });
                    }

                    // 2. Stream Answer
                    const currentAnswer = extractPartialAnswer(bufferedText);
                    if (currentAnswer && currentAnswer !== lastStreamedAnswer) {
                      const chunkToSend = currentAnswer.slice(lastStreamedAnswer.length);
                      lastStreamedAnswer = currentAnswer;
                      safeEnqueue({ content: chunkToSend });
                    }
                  }
                }
              );

              if (!content) {
                throw new Error("Empty response received from OpenRouter model stream");
              }

              let parsedContent: any = {};
              try {
                parsedContent = JSON.parse(content);
              } catch (e) {
                console.warn("[AI AUDIT] Output was not valid JSON, breaking loop and returning raw text.", e);
                finalChoiceContent = content;
                break;
              }

              // Check if it wants to call a tool
              if (parsedContent.call_tool) {
                const toolName = parsedContent.call_tool;
                const args = parsedContent.arguments || {};
                const taskId = `task-${taskCounter++}`;
                let taskTitle = "";
                let toolResult = "";

                console.log(`[AI AUDIT] Intercepted tool call: "${toolName}" with args:`, args);

                if (toolName === "search_workspace") {
                  const q = args.query || "";
                  taskTitle = `Searching workspace for "${q}"`;
                  
                  safeEnqueue({ id: taskId, title: taskTitle, status: "running" });

                  // Call the full text search engine directly (matches text in page blocks!)
                  const searchMatches = await searchNotionWorkspace(q, session.accessToken);
                  toolResult = searchMatches.length > 0
                    ? searchMatches.map(m => `- "${m.title}" (ID: ${m.id}${m.isDatabase ? ", DATABASE" : ""})`).join("\n")
                    : "No results found.";
                } else if (toolName === "fetch_page_content") {
                  const pageId = args.page_id || "";
                  const matchingPage = workspacePages.find(p => p.id === pageId);
                  const pageTitle = matchingPage ? matchingPage.title : pageId;
                  taskTitle = `Reading page content for "${pageTitle}"`;

                  safeEnqueue({ id: taskId, title: taskTitle, status: "running" });

                  const pageMarkdown = await fetchPageMarkdown(pageId, session.accessToken);
                  toolResult = pageMarkdown || "No content found for this page.";
                  console.log(`[AI AUDIT] fetch_page_content parsed markdown.`);
                }

                // Emit completed status
                safeEnqueue({ id: taskId, title: taskTitle, status: "completed" });

                // Append assistant reasoning and tool output to history
                currentMessages.push({ role: "assistant", content });
                currentMessages.push({
                  role: "user",
                  content: `Tool "${toolName}" result: ${toolResult}`
                });

                continue;
              }

              // Final answer matched
              console.log("[AI AUDIT] Reached final text answer content in reasoning loop.");
              finalChoiceContent = content;
              break;
            }

            // Emit final formatted result object
            console.log(`[AI AUDIT] Emitting final result payload: ${finalChoiceContent}`);
            safeEnqueueRaw(`data: ${finalChoiceContent}\n\n`);
          } catch (e: any) {
            console.error("[AI AUDIT] Exception in SSE stream execution:", e);
            safeEnqueue({ error: e.message || "Reasoning error" });
          } finally {
            safeClose();
          }
        }
      });

      return new Response(customStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        }
      });
    }

    // Synchronous execution path (fallback for FloatingAIChat)
    let finalChoiceContent = "";
    const SYNC_MAX_TURNS = 6;
    for (let turn = 0; turn < SYNC_MAX_TURNS; turn++) {
      console.log(`[AI AUDIT] Starting synchronous loop turn ${turn + 1}/${SYNC_MAX_TURNS}`);

      if (turn === SYNC_MAX_TURNS - 1) {
        currentMessages.push({
          role: "user",
          content: "IMPORTANT: This is your LAST turn. You MUST provide a final answer now. Do NOT call any more tools. Respond with the JSON answer format."
        });
      }
      
      let syncResult = "";
      await fetchOpenRouterStream(
        currentMessages,
        apiKey,
        model,
        (text) => { syncResult = text; }
      );

      if (!syncResult) {
        throw new Error("Empty response from OpenRouter model");
      }

      let parsedContent: any = {};
      try {
        parsedContent = JSON.parse(syncResult);
      } catch (e) {
        finalChoiceContent = syncResult;
        break;
      }

      if (parsedContent.call_tool) {
        const toolName = parsedContent.call_tool;
        const args = parsedContent.arguments || {};
        let toolResult = "";

        if (toolName === "search_workspace") {
          const q = args.query || "";
          const searchMatches = await searchNotionWorkspace(q, session.accessToken);
          toolResult = searchMatches.length > 0
            ? searchMatches.map(m => `- "${m.title}" (ID: ${m.id}${m.isDatabase ? ", DATABASE" : ""})`).join("\n")
            : "No results found.";
        } else if (toolName === "fetch_page_content") {
          const pageId = args.page_id || "";
          const pageMarkdown = await fetchPageMarkdown(pageId, session.accessToken);
          toolResult = pageMarkdown || "No content found for this page.";
        }

        currentMessages.push({ role: "assistant", content: syncResult });
        currentMessages.push({
          role: "user",
          content: `Tool "${toolName}" result: ${toolResult}`
        });

        continue;
      }

      finalChoiceContent = syncResult;
      break;
    }

    try {
      const parsed = JSON.parse(finalChoiceContent);
      return NextResponse.json(parsed);
    } catch (e) {
      return NextResponse.json({
        isModification: false,
        answer: finalChoiceContent,
      });
    }
  } catch (error: any) {
    console.error("[AI AUDIT] Exception in POST request:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
  }
}
