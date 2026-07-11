"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  SlidersHorizontal, 
  Mic, 
  ArrowUp, 
  Bot, 
  User, 
  Trash2, 
  Sparkles, 
  Table, 
  Search, 
  Presentation, 
  X,
  Send,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseAndRenderText } from "./BlockRenderer";
import { marked } from "marked";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "./ui/dropdown-menu";

interface Page {
  id: string;
  title: string;
  url: string;
  created: string;
  last_edited: string;
  emoji: string | null;
}

interface AIChatbotProps {
  pages: Page[];
}
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  rationale?: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: "running" | "completed";
}

// App integrations list
const APP_ICONS = [
  { name: "Gmail", color: "text-red-500 bg-red-50 border-red-200" },
  { name: "Calendar", color: "text-blue-500 bg-blue-50 border-blue-200" },
  { name: "Slack", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { name: "Drive", color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { name: "Teams", color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
  { name: "GitHub", color: "text-neutral-800 bg-neutral-50 border-neutral-200" },
  { name: "Jira", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { name: "Salesforce", color: "text-sky-500 bg-sky-50 border-sky-200" },
];

function parseMarkdownToReact(text: string): React.ReactNode {
  if (!text) return null;
  
  // Clean backslashes that AI often emits at the end of lines or in bullet points
  const cleaned = text
    .replace(/\\-/g, "")
    .replace(/\\/g, "");

  // Compile markdown with marked
  const htmlContent = marked.parse(cleaned, { breaks: true, gfm: true }) as string;
  
  return (
    <div 
      className="markdown-content text-sm leading-relaxed text-[#37352f]"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

export function AIChatbot({ pages }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAppsBanner, setShowAppsBanner] = useState(true);
  
  // Trace of tool tasks executed by the AI workflow loop
  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, activeTasks]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    const chatHistory = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setActiveTasks([]); // Reset tasks timeline trace

    try {
      // Call SSE endpoint
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatHistory,
          selectedPageId: null, // Full-screen search runs across all pages
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            // Handle task progress indicators
            if (cleanLine.startsWith("data: ")) {
              const dataStr = cleanLine.slice(6);
              try {
                const parsed = JSON.parse(dataStr);
                
                if (parsed.id && parsed.title) {
                  // Update current task in timeline log
                  setActiveTasks((prev) => {
                    const exists = prev.find((t) => t.id === parsed.id);
                    if (exists) {
                      return prev.map((t) => 
                        t.id === parsed.id ? { ...t, status: parsed.status } : t
                      );
                    } else {
                      return [...prev, { id: parsed.id, title: parsed.title, status: parsed.status }];
                    }
                  });
                } else if (parsed.rationale) {
                  // Rationale chunk streaming in real-time
                  setIsTyping(false);
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.id.startsWith("streaming-")) {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, rationale: (lastMsg.rationale || "") + parsed.rationale }
                      ];
                    } else {
                      return [
                        ...prev,
                        {
                          id: `streaming-${Date.now()}`,
                          role: "assistant",
                          content: "",
                          rationale: parsed.rationale,
                          timestamp: new Date()
                        }
                      ];
                    }
                  });
                } else if (parsed.content) {
                  // Text chunk streaming in real-time
                  setIsTyping(false);
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.id.startsWith("streaming-")) {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, content: lastMsg.content + parsed.content }
                      ];
                    } else {
                      return [
                        ...prev,
                        {
                          id: `streaming-${Date.now()}`,
                          role: "assistant",
                          content: parsed.content,
                          timestamp: new Date()
                        }
                      ];
                    }
                  });
                } else if (parsed.answer) {
                  // Text conversational final answer
                  setIsTyping(false);
                  setMessages((prev) => {
                    const filtered = prev.filter((m) => !m.id.startsWith("streaming-"));
                    const lastStreamingMsg = prev.find((m) => m.id.startsWith("streaming-"));
                    return [
                      ...filtered,
                      {
                        id: `ai-${Date.now()}`,
                        role: "assistant",
                        content: parsed.answer,
                        rationale: parsed.rationale || lastStreamingMsg?.rationale,
                        timestamp: new Date(),
                        suggestions: ["Show all pages", "Find AWS notes"]
                      }
                    ];
                  });
                } else if (parsed.isModification) {
                  // Edit actions final rationale response
                  setIsTyping(false);
                  setMessages((prev) => {
                    const filtered = prev.filter((m) => !m.id.startsWith("streaming-"));
                    const lastStreamingMsg = prev.find((m) => m.id.startsWith("streaming-"));
                    return [
                      ...filtered,
                      {
                        id: `ai-${Date.now()}`,
                        role: "assistant",
                        content: parsed.rationale || "I proposed modifications to the page blocks.",
                        rationale: parsed.rationale || lastStreamingMsg?.rationale,
                        timestamp: new Date()
                      }
                    ];
                  });
                }
              } catch (e) {
                // Ignore parse errors on partial streams
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error executing streaming chatbot loop:", err);
      const errorMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `Error: Failed to fetch AI answer. Reason: ${err.message || "Network request failed"}. Please make sure process.env.OPENROUTER_API_KEY is configured correctly in .env.local`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setActiveTasks([]);
  };

  const isIdle = messages.length === 0;

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden select-text relative">
      {/* Active Chat Top Header */}
      {!isIdle && (
        <div className="px-6 py-2 bg-white flex items-center justify-end select-none border-b border-[#edece9]/50">
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#7c7b77] hover:bg-[#edece9]/50 hover:text-red-600 rounded transition-colors cursor-pointer"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="font-semibold">Clear Chat</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className={cn(
        "flex-1 overflow-y-auto flex flex-col px-4 py-8 custom-scrollbar",
        isIdle ? "justify-center" : "justify-start"
      )}>
        {isIdle ? (
          /* IDLE / LANDING VIEW */
          <div className="max-w-xl w-full mx-auto text-center space-y-6 flex flex-col items-center">
            {/* Duck Mascot Logo */}
            <div className="relative flex flex-col items-center select-none animate-fade-in">
              <div className="h-16 w-16 bg-white border border-[#edece9] rounded-full shadow-md flex items-center justify-center text-3xl z-10">
                🦆
              </div>
              <div className="h-12 w-12 border border-[#edece9] rounded-full bg-white shadow-sm flex items-center justify-center -mt-3.5 text-xl font-bold font-mono">
                {`ツ`}
              </div>
            </div>

            {/* Header Title */}
            <h1 className="text-[26px] font-bold tracking-tight text-[#1a1a1a] animate-fade-in">
              Quack! What's the plan?
            </h1>

            {/* Input Card Container */}
            <div className="w-full bg-white border border-[#edece9] rounded-2xl shadow-lg p-3.5 space-y-3.5 text-left transition-all hover:border-[#c3c2c0] select-none animate-scale-in">
              {/* Text Input area */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(input);
                  }
                }}
                placeholder="Ask where a page is, query notes, or ask anything..."
                rows={1}
                className="w-full resize-none outline-none border-none text-sm text-[#37352f] placeholder-[#a4a3a1] bg-transparent py-1 select-text"
                style={{ minHeight: "44px" }}
              />

              {/* Controls Toolbar row */}
              <div className="flex items-center justify-between pt-2 text-[#7a7a78]">
                {/* Left controls */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer outline-none flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-white border border-[#edece9] shadow-md rounded-xl p-1 z-50">
                      <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-[#7c7b77] uppercase tracking-wider">Quick Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-1 border-t border-[#edece9]" />
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                          <span className="flex items-center gap-2">📂 Workspace Pages</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48 bg-white border border-[#edece9] shadow-md rounded-xl p-1 ml-1 z-50">
                          <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none" onClick={() => handleSendMessage("Search workspace for notes")}>
                            🔍 Find notes
                          </DropdownMenuItem>
                          <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none" onClick={() => handleSendMessage("Show all pages")}>
                            📄 Show all pages
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuItem 
                        className="px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer outline-none flex items-center gap-2"
                        onClick={handleClearHistory}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Chat History</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer outline-none flex items-center justify-center">
                        <SlidersHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-white border border-[#edece9] shadow-md rounded-xl p-1 z-50">
                      <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-[#7c7b77] uppercase tracking-wider">AI Settings</DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-1 border-t border-[#edece9]" />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                          <span>🤖 Model Selection</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48 bg-white border border-[#edece9] shadow-md rounded-xl p-1 ml-1 z-50">
                          <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none font-semibold">
                            Gemini 2.6 Flash
                          </DropdownMenuItem>
                          <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                            Gemini 3.5 Flash
                          </DropdownMenuItem>
                          <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                            Gemini 3.1 Pro
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      
                      <DropdownMenuItem 
                        className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none"
                        onClick={() => setShowAppsBanner(!showAppsBanner)}
                      >
                        {showAppsBanner ? "🙈 Hide Apps Banner" : "👁️ Show Apps Banner"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold bg-[#f0efea]/60 border border-[#eae9e4] px-2 py-0.5 rounded text-[#7a7a78] font-mono tracking-tighter">
                    L-2.6-FLASH
                  </span>
                  <button className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    disabled={!input.trim()}
                    onClick={() => handleSendMessage(input)}
                    className={cn(
                      "p-1.5 rounded transition-all cursor-pointer shadow-sm border",
                      input.trim()
                        ? "bg-[#37352f] border-neutral-800 text-white hover:bg-neutral-800"
                        : "bg-[#f7f7f5] border-neutral-200 text-neutral-300 cursor-not-allowed"
                    )}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* App Integrations Banner */}
            {showAppsBanner && (
              <div className="w-full max-w-xl bg-[#f7f7f5]/50 border border-[#edece9] rounded-xl px-4 py-2.5 flex items-center justify-between text-[11px] text-[#7a7a78] animate-fade-in select-none">
                <span className="font-semibold text-[#7c7b77] whitespace-nowrap">Get better answers from your apps</span>
                
                {/* Apps list */}
                <div className="flex items-center gap-1.5 overflow-x-auto px-2">
                  {APP_ICONS.map((app) => (
                    <span 
                      key={app.name} 
                      className={cn(
                        "px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider scale-95 shadow-sm whitespace-nowrap",
                        app.color
                      )}
                      title={app.name}
                    >
                      {app.name[0]}
                    </span>
                  ))}
                </div>

                <button 
                  onClick={() => setShowAppsBanner(false)}
                  className="p-1 hover:bg-[#edece9]/50 rounded transition-colors text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Actions Row */}
            <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-semibold text-[#7c7b77] pt-2 select-none animate-fade-in">
              <button 
                onClick={() => handleSendMessage("dov'è pagina dove parlo globalizzazione")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full shadow-sm hover:border-[#c3c2c0] transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-amber-500" />
                <span>Find Globalization notes</span>
              </button>
              <button 
                onClick={() => handleSendMessage("Search workspace for Scuola and list it")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full shadow-sm hover:border-[#c3c2c0] transition-all cursor-pointer"
              >
                <Table className="w-3.5 h-3.5 text-emerald-500" />
                <span>Find Scuola page</span>
              </button>
              <button 
                onClick={() => handleSendMessage("List my notes about AWS CLF-02")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full shadow-sm hover:border-[#c3c2c0] transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>AWS Notes</span>
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE CHAT VIEW */
          <div className="max-w-2xl w-full mx-auto flex flex-col space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 animate-scale-in w-full",
                  msg.role === "user" ? "max-w-[85%] ml-auto flex-row-reverse" : "max-w-full mr-auto"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 select-none shadow-sm border",
                    msg.role === "user"
                      ? "bg-[#edece9] text-[#37352f] border-neutral-300"
                      : "bg-purple-100 text-purple-700 border-purple-200"
                  )}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble content */}
                <div className="space-y-1.5 flex-1">
                  {msg.rationale && (
                    <details className="mb-2 text-xs text-[#7c7b77] border border-[#edece9] bg-[#faf9f6] rounded-lg p-2.5 select-none w-full max-w-lg">
                      <summary className="font-bold text-[#5f5e5a] cursor-pointer outline-none hover:text-black transition-colors flex items-center gap-1.5">
                        <span>💭</span>
                        <span>Thought Process</span>
                      </summary>
                      <div className="mt-1.5 whitespace-pre-wrap select-text leading-relaxed font-sans border-t border-[#edece9]/80 pt-1.5 text-neutral-600">
                        {msg.rationale}
                      </div>
                    </details>
                  )}
                  
                  {msg.content && (
                    <div
                      className={cn(
                        msg.role === "user"
                          ? "p-3.5 text-sm leading-relaxed rounded-xl shadow-sm border bg-[#37352f] text-white border-neutral-800"
                          : "p-1 text-sm leading-relaxed bg-transparent text-[#37352f]"
                      )}
                    >
                      {msg.role === "user" ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        parseMarkdownToReact(msg.content)
                      )}
                    </div>
                  )}

                  {/* Suggestion buttons */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 select-none">
                      {msg.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSendMessage(suggestion)}
                          className="px-2.5 py-1 bg-white hover:bg-[#f7f7f5] border border-[#edece9] text-[10px] text-purple-700 hover:text-purple-900 rounded-full font-semibold transition-colors shadow-sm cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Workflow Agent Task Progress Console */}
            {isTyping && activeTasks.length > 0 && (
              <div className="bg-[#f0efea]/40 border border-[#eae9e4] rounded-lg p-3.5 space-y-2 text-xs font-mono text-[#5f5e5a] max-w-[85%] mr-auto shadow-sm select-none animate-scale-in">
                <div className="flex items-center gap-1.5 font-bold text-[#37352f] uppercase select-none border-b border-[#eae9e4]/60 pb-1">
                  <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                  <span>AI Workflow Progress HUD</span>
                </div>
                <div className="space-y-1.5">
                  {activeTasks.map((t) => (
                    <div key={t.id} className="flex justify-between items-center gap-4">
                      <span className="truncate">{t.title}</span>
                      <span className={cn(
                        "font-semibold uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded border shadow-sm",
                        t.status === "running"
                          ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      )}>
                        {t.status === "running" ? "RUNNING" : "COMPLETED"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 mr-auto max-w-[80%] select-none">
                <div className="h-8 w-8 rounded-lg bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3 bg-[#f7f7f5]/40 text-[#7c7b77] border border-[#edece9] rounded-xl flex items-center gap-1.5 shadow-sm text-sm">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-[#7c7b77] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="h-1.5 w-1.5 bg-[#7c7b77] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="h-1.5 w-1.5 bg-[#7c7b77] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </span>
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Active Chat Bottom Input Box */}
      {!isIdle && (
        <div className="pb-6 px-4 bg-white select-none">
          <div className="max-w-2xl w-full mx-auto bg-white border border-[#edece9] rounded-2xl shadow-lg p-3.5 space-y-3.5 text-left transition-all hover:border-[#c3c2c0]">
            {/* Text Input area */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isTyping) {
                    handleSendMessage(input);
                  }
                }
              }}
              placeholder="Ask where a page is, query notes, or ask anything..."
              rows={1}
              className="w-full resize-none outline-none border-none text-sm text-[#37352f] placeholder-[#a4a3a1] bg-transparent py-1 select-text"
              style={{ minHeight: "44px" }}
            />

            {/* Controls Toolbar row */}
            <div className="flex items-center justify-between pt-2 text-[#7a7a78]">
              {/* Left controls */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer outline-none flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 bg-white border border-[#edece9] shadow-md rounded-xl p-1 z-50">
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-[#7c7b77] uppercase tracking-wider">Quick Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1 border-t border-[#edece9]" />
                    
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                        <span className="flex items-center gap-2">📂 Workspace Pages</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48 bg-white border border-[#edece9] shadow-md rounded-xl p-1 ml-1 z-50">
                        <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none" onClick={() => handleSendMessage("Search workspace for notes")}>
                          🔍 Find notes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none" onClick={() => handleSendMessage("Show all pages")}>
                          📄 Show all pages
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem 
                      className="px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer outline-none flex items-center gap-2"
                      onClick={handleClearHistory}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Chat History</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer outline-none flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 bg-white border border-[#edece9] shadow-md rounded-xl p-1 z-50">
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-[#7c7b77] uppercase tracking-wider">AI Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1 border-t border-[#edece9]" />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                        <span>🤖 Model Selection</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48 bg-white border border-[#edece9] shadow-md rounded-xl p-1 ml-1 z-50">
                        <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none font-semibold">
                          Gemini 2.6 Flash
                        </DropdownMenuItem>
                        <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                          Gemini 3.5 Flash
                        </DropdownMenuItem>
                        <DropdownMenuItem className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none">
                          Gemini 3.1 Pro
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    
                    <DropdownMenuItem 
                      className="px-2 py-1.5 text-sm text-[#37352f] hover:bg-[#edece9]/40 rounded-lg cursor-pointer outline-none"
                      onClick={() => setShowAppsBanner(!showAppsBanner)}
                    >
                      {showAppsBanner ? "🙈 Hide Apps Banner" : "👁️ Show Apps Banner"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold bg-[#f0efea]/60 border border-[#eae9e4] px-2 py-0.5 rounded text-[#7a7a78] font-mono tracking-tighter">
                  L-2.6-FLASH
                </span>
                <button className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  disabled={!input.trim() || isTyping}
                  onClick={() => handleSendMessage(input)}
                  className={cn(
                    "p-1.5 rounded transition-all cursor-pointer shadow-sm border",
                    input.trim() && !isTyping
                      ? "bg-[#37352f] border-neutral-800 text-white hover:bg-neutral-800"
                      : "bg-[#f7f7f5] border-neutral-200 text-neutral-300 cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
