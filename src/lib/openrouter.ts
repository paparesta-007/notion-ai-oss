// OpenRouter API Integration Library
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Standard Chat Completion using OpenRouter API
 * (Prepares raw JSON response generation)
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const model = options.model || "google/gemini-2.5-pro";
  const apiKey = process.env.OPENROUTER_API_KEY || "";

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter for ranking
        "X-Title": "Notion AI Integration",       // Required by OpenRouter for ranking
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenRouter chatCompletion failed:", error);
    throw error;
  }
}

/**
 * Streaming Output Response using OpenRouter
 * (Prepares SSE (Server-Sent Events) chunk streaming)
 */
export async function streamingOutput(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options: ChatOptions = {}
): Promise<void> {
  const model = options.model || "google/gemini-2.5-pro";
  const apiKey = process.env.OPENROUTER_API_KEY || "";

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Notion AI Integration",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    if (!reader) return;

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
        if (cleanLine === "data: [DONE]") break;

        try {
          const parsed = JSON.parse(cleanLine.slice(6));
          const chunkText = parsed.choices?.[0]?.delta?.content || "";
          if (chunkText) {
            onChunk(chunkText);
          }
        } catch (e) {
          // Ignore incomplete JSON chunks
        }
      }
    }
  } catch (error) {
    console.error("OpenRouter streamingOutput failed:", error);
    throw error;
  }
}

/**
 * Structured JSON Output using OpenRouter
 * (Prepares schema constraints for JSON responses)
 */
export async function structuredOutput<T>(
  messages: ChatMessage[],
  jsonSchema: Record<string, any>,
  options: ChatOptions = {}
): Promise<T> {
  const model = options.model || "openai/gpt-4o-mini";
  const apiKey = process.env.OPENROUTER_API_KEY || "";

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Notion AI Integration",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.1,
        response_format: {
          type: "json_object"
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter structured API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content) as T;
  } catch (error) {
    console.error("OpenRouter structuredOutput failed:", error);
    throw error;
  }
}
