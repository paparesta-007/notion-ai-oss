"use client";

import React, { useState, useRef, useEffect } from "react";
import { Users, ChevronDown, Lock, HelpCircle, Link as LinkIcon, List, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  bg: string;
  access: "Full access" | "Can edit" | "Can comment" | "Can view" | "Mixed access";
  isGuest?: boolean;
}

export function SharePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"share" | "publish">("share");
  const [emailInput, setEmailInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Exact list from user screenshot
  const [users, setUsers] = useState<ShareUser[]>([
    {
      id: "u-1",
      name: "Papa (You)",
      email: "t.paparesta@gmail.com",
      role: "Owner",
      initials: "P",
      bg: "bg-neutral-800 text-white",
      access: "Full access"
    },
    {
      id: "u-2",
      name: "GRETA MORAMARCO",
      email: "g.moramarco.3194@vallauri.edu",
      role: "Guest",
      initials: "G",
      bg: "bg-neutral-100 text-neutral-600 border border-neutral-300",
      access: "Can comment",
      isGuest: true
    },
    {
      id: "u-3",
      name: "SIMONE VIRANO",
      email: "s.virano.3343@vallauri.edu",
      role: "Guest",
      initials: "S",
      bg: "bg-purple-600 text-white",
      access: "Full access",
      isGuest: true
    },
    {
      id: "u-4",
      name: "Virano",
      email: "virano.simo@gmail.com",
      role: "Guest",
      initials: "SV",
      bg: "bg-slate-900 text-yellow-400 font-bold",
      access: "Full access",
      isGuest: true
    }
  ]);

  // Handle dropdown changes
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Page link copied to clipboard!");
  };

  const handleShare = () => {
    if (!emailInput.trim()) return;
    const newGuest: ShareUser = {
      id: `u-${Date.now()}`,
      name: emailInput.split("@")[0].toUpperCase(),
      email: emailInput,
      role: "Guest",
      initials: emailInput.slice(0, 2).toUpperCase(),
      bg: "bg-indigo-500 text-white",
      access: "Can view",
      isGuest: true
    };
    setUsers([...users, newGuest]);
    setEmailInput("");
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Notion-style Share Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 border border-[#e3e2e0] hover:bg-[#f7f7f5] text-xs font-semibold text-[#37352f] px-2.5 py-1.5 rounded bg-white shadow-sm transition-all cursor-pointer select-none"
      >
        <Users className="w-3.5 h-3.5 text-[#37352f]" />
        <span>Share</span>
        <ChevronDown className="w-3 h-3 text-[#7c7b77]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[440px] bg-white border border-[#edece9] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] z-50 flex flex-col overflow-hidden text-[#37352f] text-[13px] animate-scale-in">
          
          {/* Top Tabs */}
          <div className="flex border-b border-[#f1f1ef] px-4 pt-2">
            <button
              onClick={() => setActiveTab("share")}
              className={cn(
                "pb-2 px-3 font-semibold text-[13px] border-b-2 transition-colors cursor-pointer select-none",
                activeTab === "share" ? "border-[#37352f] text-[#37352f]" : "border-transparent text-[#7c7b77] hover:text-[#37352f]"
              )}
            >
              Share
            </button>
            <button
              onClick={() => setActiveTab("publish")}
              className={cn(
                "pb-2 px-3 font-semibold text-[13px] border-b-2 transition-colors cursor-pointer select-none",
                activeTab === "publish" ? "border-[#37352f] text-[#37352f]" : "border-transparent text-[#7c7b77] hover:text-[#37352f]"
              )}
            >
              Publish
            </button>
          </div>

          {activeTab === "share" ? (
            <div className="flex flex-col">
              {/* Input sharing box */}
              <div className="p-4 flex gap-2 border-b border-[#f1f1ef]">
                <input
                  type="text"
                  placeholder="Email or group, separated by commas"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleShare()}
                  className="flex-1 bg-white border border-[#e3e2e0] rounded px-3 py-1.5 outline-none focus:border-[#2383e2] text-xs transition-colors"
                />
                <button
                  onClick={handleShare}
                  className="bg-[#2383e2] hover:bg-[#1a65b0] text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors cursor-pointer"
                >
                  Share
                </button>
              </div>

              {/* Warning Notice Block */}
              <div className="mx-4 mt-3 p-3 bg-[#f7f7f5] border border-[#edece9] rounded-lg flex items-start gap-2.5">
                <List className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-[#7c7b77] leading-relaxed">
                  Share settings on this page differ from the parent page 
                  <span className="block underline text-[#37352f] font-semibold cursor-pointer mt-0.5">Materie</span>
                </div>
              </div>

              {/* Invitees List */}
              <div className="px-4 py-3 flex flex-col divide-y divide-[#f1f1ef] max-h-[250px] overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 select-none",
                        user.bg
                      )}>
                        {user.initials}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <div className="font-semibold text-xs text-[#37352f] flex items-center gap-1.5 truncate">
                          <span>{user.name}</span>
                          {user.isGuest && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] px-1 py-0.2 font-medium">Guest</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#7c7b77] truncate">{user.email}</div>
                      </div>
                    </div>

                    {/* Access level dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                        className="text-[#7c7b77] hover:text-[#37352f] text-xs font-semibold flex items-center gap-1 hover:bg-[#f7f7f5] px-2 py-1 rounded transition-colors cursor-pointer select-none"
                      >
                        <span>{user.access}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {activeDropdown === user.id && (
                        <div className="absolute right-0 mt-1 w-[150px] bg-white border border-[#edece9] rounded-lg shadow-lg py-1 z-50 text-xs">
                          {(["Full access", "Can edit", "Can comment", "Can view"] as const).map((opt) => (
                            <button
                              key={opt}
                              onClick={() => {
                                setUsers(users.map(u => u.id === user.id ? { ...u, access: opt } : u));
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-[#f7f7f5] flex items-center justify-between cursor-pointer"
                            >
                              <span>{opt}</span>
                              {user.access === opt && <Check className="w-3.5 h-3.5 text-neutral-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Additional Group Item */}
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center flex-shrink-0">
                      <List className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div className="flex flex-col">
                      <div className="font-semibold text-xs text-[#37352f]">People invited to Materie</div>
                      <div className="text-[11px] text-[#7c7b77]">4 people</div>
                    </div>
                  </div>
                  <span className="text-xs text-[#7c7b77] px-2 font-semibold select-none">Mixed access</span>
                </div>
              </div>

              {/* General Access Lock Block */}
              <div className="px-4 py-3 bg-[#f7f7f5]/40 border-t border-b border-[#f1f1ef]">
                <div className="text-[10px] font-bold text-[#7c7b77] uppercase tracking-wider mb-2.5 select-none">General access</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded bg-white border border-[#e3e2e0] flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3.5 h-3.5 text-neutral-500" />
                    </div>
                    <div className="flex flex-col">
                      <div className="font-semibold text-xs text-[#37352f]">Only people invited</div>
                      <div className="text-[11px] text-[#7c7b77]">Restricted access</div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#7c7b77] text-xs">
              Publish tab options are currently managed at the workspace level.
            </div>
          )}

          {/* Popover Footer bar */}
          <div className="bg-[#f7f7f5]/80 px-4 py-3 border-t border-[#edece9] flex items-center justify-between select-none">
            <button className="text-[#7c7b77] hover:text-[#37352f] text-xs font-semibold flex items-center gap-1.5 hover:underline cursor-pointer">
              <HelpCircle className="w-4 h-4 text-neutral-400" />
              <span>Learn about sharing</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="bg-white border border-[#e3e2e0] hover:bg-[#f7f7f5] text-[#37352f] text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Copy link</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
