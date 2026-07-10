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
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function AIChatbot({ pages }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAppsBanner, setShowAppsBanner] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response logic
    setTimeout(() => {
      setIsTyping(false);
      
      const query = textToSend.toLowerCase();
      let responseContent = "";
      let suggestions: string[] = [];

      if (query.includes("pages") || query.includes("workspace") || query.includes("pagine") || query.includes("create")) {
        const pageList = pages.map(p => `- ${p.emoji || "📄"} **${p.title}** (Edited ${p.last_edited})`).join("\n");
        responseContent = `Quack! I searched your workspace and found **${pages.length} pages**:\n\n${pageList || "No pages shared yet. Please share pages in Notion."}`;
        suggestions = ["Find Gestione lavoro page details", "Summarize weekly schedule"];
      } else if (query.includes("gestione") || query.includes("lavoro") || query.includes("schedule") || query.includes("slides")) {
        const page = pages.find(p => p.title.toLowerCase().includes("gestione"));
        if (page) {
          responseContent = `I located the page **${page.emoji || "📄"} ${page.title}** in your workspace.\n\nIt was created on **${page.created}** and last modified on **${page.last_edited}**.\n\nIt features your weekly schedule grid and teacher databases. You can click on its name in the sidebar to open the page directly!`;
        } else {
          responseContent = "I found a schedule reference, but the page **Gestione lavoro** doesn't seem to be shared with my connection. Please check your page connection sharing settings in Notion.";
        }
        suggestions = ["Show all pages", "Open Gestione lavoro"];
      } else if (query.includes("materie") || query.includes("database") || query.includes("spreadsheet")) {
        responseContent = "I scanned your **Materie** database! It has columns for *Subject* and *Professor* (featuring teachers like Boaglio, Marchisio, Cambieri, Necchi, etc.).\n\nYou can query status and assign tasks to each teacher. Would you like me to explain how to add new professors to this database?";
        suggestions = ["Show all pages", "How to add database row"];
      } else {
        responseContent = `Quack! I'm analyzing your Notion workspace index for "${textToSend}"...\n\nI can see you have pages like ${pages.slice(0, 2).map(p => `*${p.title}*`).join(" and ")} active.\n\nHow else can I assist you with your schedule or notes?`;
        suggestions = ["Show all pages", "Summarize weekly schedule"];
      }

      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      setMessages((prev) => [...prev, aiResponse]);
    }, 1200);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const isIdle = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[850px] overflow-hidden select-text relative">
      {/* Active Chat Top Header */}
      {!isIdle && (
        <div className="px-6 py-3 border-b border-[#edece9] bg-white flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            {/* Tiny Duck logo */}
            <div className="h-7 w-7 bg-amber-50 rounded-full border border-amber-200 flex items-center justify-center text-sm">
              🦆
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#1a1a1a]">Notion Assistant</h2>
              <p className="text-[10px] text-[#7c7b77] mt-0.5 font-medium leading-none">Notion AI Chat</p>
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            className="p-1.5 hover:bg-[#edece9] rounded text-[#7c7b77] hover:text-red-600 transition-colors focus:outline-none cursor-pointer"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className={cn(
        "flex-1 overflow-y-auto flex flex-col px-4 py-8",
        isIdle ? "justify-center" : "justify-start"
      )}>
        {isIdle ? (
          /* IDLE / LANDING VIEW (Centered layout matching screenshot) */
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
                placeholder="Do anything with AI..."
                rows={1}
                className="w-full resize-none outline-none border-none text-sm text-[#37352f] placeholder-[#a4a3a1] bg-transparent py-1 select-text"
                style={{ minHeight: "44px" }}
              />

              {/* Controls Toolbar row */}
              <div className="flex items-center justify-between border-t border-[#f1f1ef] pt-3 text-[#7a7a78]">
                {/* Left controls */}
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-[#edece9]/50 rounded transition-colors cursor-pointer">
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-semibold bg-[#f7f7f5] border border-[#edece9] px-2 py-0.5 rounded shadow-sm text-[#7a7a78]">
                    Auto
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
                onClick={() => handleSendMessage("Create slide presentation outline")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full shadow-sm hover:border-[#c3c2c0] transition-all cursor-pointer"
              >
                <Presentation className="w-3.5 h-3.5 text-amber-500" />
                <span>Create Slides</span>
              </button>
              <button 
                onClick={() => handleSendMessage("Show spreadsheets for my databases")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full shadow-sm hover:border-[#c3c2c0] transition-all cursor-pointer"
              >
                <Table className="w-3.5 h-3.5 text-emerald-500" />
                <span>Spreadsheets</span>
              </button>
              <button 
                onClick={() => handleSendMessage("Research page contents")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full shadow-sm hover:border-[#c3c2c0] transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-blue-500" />
                <span>Research</span>
              </button>
              <button 
                onClick={() => handleSendMessage("Visualize database professors and subjects")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full shadow-sm hover:border-[#c3c2c0] transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Visualize</span>
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE CHAT VIEW (Slide-up messages overlay) */
          <div className="max-w-2xl w-full mx-auto flex flex-col space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%] animate-scale-in",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
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
                <div className="space-y-1.5">
                  <div
                    className={cn(
                      "p-3.5 text-sm leading-relaxed rounded-xl shadow-sm border",
                      msg.role === "user"
                        ? "bg-[#37352f] text-white border-neutral-800"
                        : "bg-[#f7f7f5]/40 text-[#37352f] border-[#edece9]"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>

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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="p-4 bg-white border-t border-[#edece9] flex items-center gap-3 select-none"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Do anything with AI..."
            className="flex-1 h-9 px-4 text-xs bg-[#f7f7f5]/60 hover:bg-[#f7f7f5] border border-[#edece9] rounded-lg outline-none focus:border-purple-500 focus:bg-white transition-all select-text"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-lg shadow-sm border transition-all cursor-pointer",
              input.trim() && !isTyping
                ? "bg-[#37352f] text-white border-neutral-800 hover:bg-neutral-800"
                : "bg-[#f7f7f5] text-neutral-300 border-neutral-200/50 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
