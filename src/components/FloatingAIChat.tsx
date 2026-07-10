"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Trash2,
  Plus,
  SlidersHorizontal,
  Mic,
  ArrowUp,
  Table,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DiffViewer, type BlockEdit } from "./DiffViewer";

interface Page {
  id: string;
  title: string;
  url: string;
  created: string;
  last_edited: string;
  emoji: string | null;
}

interface FloatingAIChatProps {
  pages: Page[];
  selectedPageId?: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  edits?: BlockEdit[];
  editsApplied?: boolean;
}

export function FloatingAIChat({ pages, selectedPageId }: FloatingAIChatProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Detect if the user query is a page modification request
  const isModificationQuery = useCallback((query: string): boolean => {
    const modKeywords = [
      "change", "modify", "update", "edit", "rewrite", "replace",
      "rename", "fix", "correct", "cambia", "modifica", "aggiorna",
      "riscrivi", "correggi", "sostituisci", "add", "remove", "delete",
      "set", "make", "turn", "convert", "write", "put", "inserisci",
      "aggiungi", "rimuovi", "elimina", "scrivi",
    ];
    const lowerQuery = query.toLowerCase();
    return modKeywords.some((kw) => lowerQuery.includes(kw));
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend: string) => {
      if (!textToSend.trim()) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: textToSend,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);

      // Check if it's a modification request AND a page is selected
      if (isModificationQuery(textToSend) && selectedPageId) {
        try {
          const res = await fetch("/api/ai/modify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageId: selectedPageId, query: textToSend }),
          });

          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }

          const data = await res.json();

          if (data.instructions && data.instructions.length > 0) {
            const aiResponse: Message = {
              id: `ai-${Date.now()}`,
              role: "assistant",
              content: data.rationale || "Here are the proposed changes:",
              timestamp: new Date(),
              edits: data.instructions,
            };

            setMessages((prev) => [...prev, aiResponse]);
          } else {
            const aiResponse: Message = {
              id: `ai-${Date.now()}`,
              role: "assistant",
              content:
                data.rationale ||
                "I analyzed the page but found no blocks that need modification for your request.",
              timestamp: new Date(),
              suggestions: ["Show pages", "What pages are in my workspace?"],
            };
            setMessages((prev) => [...prev, aiResponse]);
          }
        } catch (error: any) {
          const errorMsg: Message = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: `⚠️ Couldn't process the modification: ${error.message}. Make sure you have an OpenRouter API key set in your .env.local file (\`OPENROUTER_API_KEY\`).`,
            timestamp: new Date(),
            suggestions: ["What pages are in my workspace?"],
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } else if (isModificationQuery(textToSend) && !selectedPageId) {
        // Modification intent but no page selected
        const aiResponse: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content:
            "🦆 Quack! I see you want to modify content, but no page is currently selected. Please select a page from the sidebar first, then ask me to make changes.",
          timestamp: new Date(),
          suggestions: ["What pages are in my workspace?"],
        };
        setMessages((prev) => [...prev, aiResponse]);
      } else {
        // Regular conversational response (non-modification queries) via OpenRouter chat completions
        try {
          const chatHistory = [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: chatHistory,
              selectedPageId: selectedPageId || null,
            }),
          });

          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }

          const data = await res.json();

          const aiResponse: Message = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: data.answer || "🦆 Quack! I couldn't get a response. Try again.",
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiResponse]);
        } catch (error: any) {
          const errorMsg: Message = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: `⚠️ Sorry, I had trouble answering that: ${error.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      }

      setIsTyping(false);
    },
    [pages, selectedPageId, isModificationQuery]
  );

  const handleApplyEdits = useCallback(
    async (messageId: string, edits: BlockEdit[]) => {
      setIsApplying(true);

      try {
        const res = await fetch("/api/notion/apply-edits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions: edits }),
        });

        const data = await res.json();

        // Mark edits as applied on the message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, editsApplied: true } : msg
          )
        );

        // Add confirmation message
        const confirmMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.success
            ? `✅ Successfully applied ${data.applied} change${data.applied !== 1 ? "s" : ""} to Notion!`
            : `⚠️ Applied ${data.applied} changes, but ${data.failed} failed. ${data.errors?.join(", ") || ""}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, confirmMsg]);

        // Refresh the page layout immediately so the changes are visible on the main page blocks content!
        router.refresh();
      } catch (error: any) {
        const errorMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: `❌ Failed to apply changes: ${error.message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }

      setIsApplying(false);
    },
    []
  );

  const handleDiscardEdits = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, edits: undefined } : msg
      )
    );

    const discardMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "Changes discarded. Feel free to ask for something else!",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, discardMsg]);
  }, []);

  const handleClearHistory = () => {
    setMessages([]);
  };

  const isIdle = messages.length === 0;

  return (
    <>
      {/* Floating Toggle Button (FAB) - Hidden when popup is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 z-50 select-none"
          title="Ask Notion AI"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </button>
      )}

      {/* Floating Chat Panel Popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[440px] h-[640px] bg-white border border-[#edece9] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden select-text animate-scale-in">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#edece9] bg-[#f7f7f5]/40 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-amber-50 rounded-full border border-amber-200 flex items-center justify-center text-lg shadow-sm">
                🦆
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1a1a1a]">
                  Notion AI Copilot
                </h3>
                <p className="text-[10px] text-[#7c7b77] mt-0.5 font-medium leading-none">
                  {selectedPageId
                    ? `Editing: ${pages.find((p) => p.id === selectedPageId)?.title || "Page"}`
                    : "Instant workspace companion"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isIdle && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 hover:bg-[#edece9] rounded text-[#7c7b77] hover:text-red-600 transition-colors cursor-pointer"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-[#edece9] rounded text-[#7c7b77] hover:text-[#37352f] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages scrolling list */}
          <div
            className={cn(
              "flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4",
              isIdle ? "justify-center" : "justify-start"
            )}
          >
            {isIdle ? (
              /* IDLE STATE: Centered duck mascot and input */
              <div className="text-center space-y-5 flex flex-col items-center select-none">
                <div className="relative flex flex-col items-center">
                  <div className="h-14 w-14 bg-white border border-[#edece9] rounded-full shadow-md flex items-center justify-center text-3xl z-10">
                    🦆
                  </div>
                  <div className="h-10 w-10 border border-[#edece9] rounded-full bg-white shadow-sm flex items-center justify-center -mt-2 text-base font-bold font-mono">
                    {`ツ`}
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-[#1a1a1a]">
                    Quack! What&apos;s the plan?
                  </h4>
                  <p className="text-xs text-[#7a7a78] mt-0.5">
                    {selectedPageId
                      ? "Ask me to modify this page"
                      : "Ask anything about your workspace"}
                  </p>
                </div>

                {/* Compact prompt button chips */}
                <div className="flex flex-wrap justify-center gap-2 pt-1.5">
                  {selectedPageId ? (
                    <>
                      <button
                        onClick={() =>
                          handleSendMessage(
                            "Rewrite all headings to be more descriptive"
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full text-[10.5px] font-semibold text-[#7c7b77] shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span>Rewrite headings</span>
                      </button>
                      <button
                        onClick={() =>
                          handleSendMessage("Fix grammar and spelling errors")
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full text-[10.5px] font-semibold text-[#7c7b77] shadow-sm cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5 text-blue-500" />
                        <span>Fix grammar</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          handleSendMessage(
                            "What pages are in my workspace?"
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full text-[10.5px] font-semibold text-[#7c7b77] shadow-sm cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5 text-blue-500" />
                        <span>Search pages</span>
                      </button>
                      <button
                        onClick={() =>
                          handleSendMessage("Summarize weekly schedule")
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f7f7f5] border border-[#edece9] rounded-full text-[10.5px] font-semibold text-[#7c7b77] shadow-sm cursor-pointer"
                      >
                        <Table className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Schedule</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* ACTIVE MESSAGES STREAM */
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 max-w-[95%] animate-scale-in",
                      msg.role === "user"
                        ? "ml-auto flex-row-reverse"
                        : "mr-auto"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 select-none shadow-sm border text-xs",
                        msg.role === "user"
                          ? "bg-[#edece9] text-[#37352f]"
                          : "bg-purple-100 text-purple-700"
                      )}
                    >
                      {msg.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div
                        className={cn(
                          "p-3 text-sm leading-relaxed rounded-xl shadow-sm border",
                          msg.role === "user"
                            ? "bg-[#37352f] text-white border-neutral-800"
                            : "bg-[#f7f7f5]/40 text-[#37352f] border-[#edece9]"
                        )}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>

                      {/* Diff Viewer for edit proposals */}
                      {msg.edits &&
                        msg.edits.length > 0 &&
                        !msg.editsApplied && (
                          <DiffViewer
                            edits={msg.edits}
                            onApply={() =>
                              handleApplyEdits(msg.id, msg.edits!)
                            }
                            onDiscard={() => handleDiscardEdits(msg.id)}
                            isApplying={isApplying}
                          />
                        )}

                      {/* Applied badge */}
                      {msg.editsApplied && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold">
                          ✅ Changes applied
                        </div>
                      )}

                      {/* Suggestions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 select-none">
                          {msg.suggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSendMessage(s)}
                              className="px-2.5 py-1 bg-white hover:bg-[#f7f7f5] border border-[#edece9] text-[10.5px] text-purple-700 hover:text-purple-900 rounded-full font-semibold transition-colors cursor-pointer shadow-sm"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-2.5 mr-auto max-w-[80%] select-none">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="p-3 bg-[#f7f7f5]/40 text-[#7c7b77] border border-[#edece9] rounded-xl flex items-center gap-1.5 shadow-sm text-xs">
                      <span>Analyzing page blocks...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Bottom Card Input Panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-4 border-t border-[#edece9] bg-white flex flex-col gap-2 select-none"
          >
            {isIdle ? (
              /* Idle compact control box */
              <div className="w-full bg-[#f7f7f5]/50 border border-[#edece9] rounded-xl p-3 space-y-3 text-left">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedPageId
                      ? "Ask to modify this page..."
                      : "Ask anything..."
                  }
                  className="w-full outline-none border-none text-sm text-[#37352f] placeholder-[#a4a3a1] bg-transparent py-0.5 select-text"
                />
                <div className="flex items-center justify-between border-t border-[#f1f1ef] pt-2.5 text-[#7a7a78]">
                  <div className="flex gap-2">
                    <Plus className="w-4 h-4 cursor-pointer hover:text-neutral-700" />
                    <SlidersHorizontal className="w-4 h-4 cursor-pointer hover:text-neutral-700" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 cursor-pointer hover:text-neutral-700" />
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className={cn(
                        "p-1.5 rounded cursor-pointer transition-all border",
                        input.trim()
                          ? "bg-[#37352f] border-neutral-800 text-white hover:bg-neutral-800"
                          : "bg-white border-neutral-200 text-neutral-300 cursor-not-allowed"
                      )}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Active chatting input textbar */
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Do anything with AI..."
                  className="flex-1 h-10 px-3.5 text-sm bg-[#f7f7f5]/60 hover:bg-[#f7f7f5] border border-[#edece9] rounded-lg outline-none focus:border-purple-500 focus:bg-white transition-all select-text"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-lg shadow-sm border transition-all cursor-pointer",
                    input.trim() && !isTyping
                      ? "bg-[#37352f] text-white border-neutral-800 hover:bg-neutral-800"
                      : "bg-[#f7f7f5] text-neutral-300 border-neutral-200/50 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}
