"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  DollarSign,
  Bot,
  FileText,
  Unlock,
  Link2,
  Zap,
  Menu,
  X,
  ArrowRight,
  Star,
  MessageSquare,
  Repeat2,
  BarChart3,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  RefreshCw,
  Shield,
} from "lucide-react";

function Github({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ─── Counter ─── */
function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let n = 0;
      const step = Math.ceil(to / 60);
      const t = setInterval(() => {
        n = Math.min(n + step, to);
        setCount(n);
        if (n >= to) clearInterval(t);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Accordion ─── */
function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e8e7e3] py-5 cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15px] font-medium text-[#1e1e1e]">{q}</span>
        <span className="transition-transform duration-200 text-xl text-[#a4a3a1] select-none flex-shrink-0"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
      </div>
      {open && <p className="mt-3 text-[14px] text-[#787774] leading-relaxed">{a}</p>}
    </div>
  );
}

/* ─── Nav ─── */
function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav className={cn("sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#e8e7e3] transition-shadow duration-200", scrolled && "shadow-sm")}>
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="#" className="flex items-center gap-2 select-none">
          <div className="w-7 h-7 rounded-[6px] bg-[#1e1e1e] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h7l3 3v7H2V2z" fill="white" fillOpacity="0.9"/>
              <path d="M9 2l3 3H9V2z" fill="white" fillOpacity="0.4"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-[#1e1e1e]">
            NotionAI <span className="text-[#5c5bd4]">OSS</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[14px] text-[#787774]">
          {[["Features", "#features"], ["How it works", "#how"], ["Compare", "#pricing"], ["FAQ", "#faq"]].map(([l, h]) => (
            <a key={l} href={h} className="hover:text-[#1e1e1e] transition-colors">{l}</a>
          ))}
          <a href="https://github.com" className="flex items-center gap-1.5 hover:text-[#1e1e1e] transition-colors">
            <Github size={14} /> GitHub
          </a>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="text-[14px] text-[#787774] hover:text-[#1e1e1e] px-3 py-1.5 transition-colors">Log in</Link>
          <Link href="/login" className="text-[14px] text-white bg-[#1e1e1e] hover:bg-[#37352f] px-4 py-1.5 rounded-full transition-colors font-medium flex items-center gap-1">
            Get started <ArrowRight size={13} />
          </Link>
        </div>

        <button className="md:hidden p-2 text-[#787774]" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[#e8e7e3] bg-white px-5 py-4 flex flex-col gap-4">
          {["Features", "How it works", "Compare", "FAQ", "GitHub"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "")}`} className="text-[15px] text-[#37352f]" onClick={() => setMenuOpen(false)}>{l}</a>
          ))}
          <Link href="/login" className="text-[14px] text-white bg-[#1e1e1e] px-4 py-2 rounded-full text-center font-medium">Get started</Link>
        </div>
      )}
    </nav>
  );
}

/* ─── App Mockup ─── */
function AppMockup() {
  return (
    <div className="relative mx-auto max-w-2xl mt-14">
      <div className="rounded-xl overflow-hidden shadow-2xl border border-[#e8e7e3]">
        <div className="bg-[#f7f6f3] border-b border-[#e8e7e3] px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white border border-[#e8e7e3] rounded-md px-3 py-1 text-xs text-[#a4a3a1] text-center">localhost:3000</div>
          </div>
        </div>
        <div className="bg-white flex" style={{ height: 340 }}>
          <div className="w-52 bg-[#f7f6f3] border-r border-[#e8e7e3] p-3 flex flex-col gap-0.5 flex-shrink-0">
            <div className="text-[11px] font-semibold text-[#a4a3a1] uppercase tracking-wider px-2 pt-2 pb-2">Workspace</div>
            {[
              { label: "Home", active: false },
              { label: "Meeting Notes", active: false },
              { label: "Q3 Report", active: true },
              { label: "Goals 2026", active: false },
              { label: "Ideas", active: false },
              { label: "Roadmap", active: false },
            ].map(({ label, active }) => (
              <div key={label} className={cn("text-[13px] px-2 py-1.5 rounded-md flex items-center gap-2",
                active ? "bg-[#e8e7e3] text-[#1e1e1e] font-medium" : "text-[#787774]")}>
                <FileText size={12} strokeWidth={1.5} /> {label}
              </div>
            ))}
            <div className="mt-auto pt-3 border-t border-[#e8e7e3]">
              <div className="text-[11px] text-[#a4a3a1] px-2 mb-1 font-medium">Switch model</div>
              <div className="text-[12px] px-2 py-1.5 rounded-md bg-[#f0efff] text-[#5c5bd4] font-medium flex items-center gap-1.5">
                <span>✦</span> claude-3-7-sonnet
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-[#5c5bd4] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-bold">AI</span>
                </div>
                <div>
                  <div className="text-[11px] text-[#a4a3a1] mb-1">Notion AI · Powered by OpenRouter</div>
                  <div className="bg-[#f7f6f3] rounded-lg px-3 py-2 text-[13px] text-[#37352f] max-w-xs">
                    Hi! I can search your workspace, summarize pages, draft content, and answer questions.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-start justify-end">
                <div className="bg-[#1e1e1e] rounded-lg px-3 py-2 text-[13px] text-white max-w-xs">
                  Summarize the Q3 Report and list the top 3 action items
                </div>
                <div className="w-7 h-7 rounded-full bg-[#e8e7e3] flex items-center justify-center flex-shrink-0 text-[11px] font-semibold">T</div>
              </div>
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-[#5c5bd4] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-bold">AI</span>
                </div>
                <div className="bg-[#f7f6f3] rounded-lg px-3 py-2 text-[13px] text-[#37352f] max-w-xs">
                  Q3 2026 — Revenue grew 23% YoY. Top actions: ① Finalize Q4 roadmap by July 20 ② Schedule customer reviews ③ Hire 2 senior engineers
                </div>
              </div>
            </div>
            <div className="border-t border-[#e8e7e3] p-3">
              <div className="border border-[#e8e7e3] rounded-lg px-3 py-2 text-[13px] text-[#a4a3a1] flex items-center justify-between">
                <span>Ask AI anything about this page…</span>
                <span className="text-[11px] bg-[#f7f6f3] px-1.5 py-0.5 rounded border border-[#e8e7e3]">⏎</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -left-4 bg-white border border-[#e8e7e3] shadow-lg rounded-xl px-3 py-2 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[#dcfce7] flex items-center justify-center">
          <DollarSign size={13} className="text-green-600" />
        </div>
        <div>
          <div className="text-[12px] font-bold text-[#1e1e1e]">$0.0008</div>
          <div className="text-[10px] text-[#787774]">This query cost</div>
        </div>
      </div>
      <div className="absolute -top-4 -right-3 bg-white border border-[#e8e7e3] shadow-lg rounded-xl px-3 py-2 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[12px] text-[#37352f] font-medium">GPT-4o, Claude, Gemini +40</span>
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, #1e1e1e 1px, transparent 1px)",
        backgroundSize: "28px 28px", opacity: 0.03,
      }} />
      <div className="relative max-w-6xl mx-auto px-5 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 border border-[#e8e7e3] bg-white rounded-full px-4 py-1.5 mb-10 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5c5bd4] animate-pulse" />
          <span className="text-[13px] text-[#787774]">Open source · MIT license · Free to self-host</span>
        </div>

        <h1 className="font-bold text-[#1e1e1e] tracking-tight mb-6 leading-[1.1]"
          style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)" }}>
          Notion AI,{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-[#5c5bd4]">without</span>
            <span className="absolute left-0 right-0 bottom-[0.08em] h-[0.28em] rounded-sm pointer-events-none"
              style={{ background: "linear-gradient(90deg, #c7c6ff 0%, #a5a4ff 100%)", zIndex: 0, opacity: 0.45 }} />
          </span>
          <br />the subscription.
        </h1>

        <p className="text-[17px] text-[#787774] max-w-xl mb-10 leading-relaxed">
          The open-source alternative to{" "}
          <span className="text-[#5c5bd4] font-medium">Notion AI</span>.
          {" "}Powered by{" "}
          <a href="https://openrouter.ai" className="text-[#1e1e1e] font-semibold underline underline-offset-2 decoration-[#e8e7e3]">OpenRouter</a>
          {" "}— pick any model, pay{" "}
          <span className="font-semibold text-[#1e1e1e]">only</span> for what you use.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
          <Link href="/login" className="inline-flex items-center gap-2 text-[15px] text-white bg-[#1e1e1e] hover:bg-[#37352f] px-7 py-2.5 rounded-full transition-colors font-medium shadow-sm">
            Start for free <ArrowRight size={15} />
          </Link>
          <a href="https://github.com" className="inline-flex items-center gap-2 text-[15px] text-[#1e1e1e] border border-[#e8e7e3] bg-white hover:bg-[#f7f6f3] px-6 py-2.5 rounded-full transition-colors font-medium">
            <Github size={15} /> View on GitHub
            <span className="inline-flex items-center gap-1 text-[13px] text-[#787774]">
              <Star size={11} className="fill-amber-400 text-amber-400" /> 2.4k
            </span>
          </a>
        </div>

        <p className="text-[13px] text-[#a4a3a1]">No credit card required · Works with your existing Notion account</p>
        <AppMockup />
      </div>
    </section>
  );
}

/* ─── Stats bar ─── */
function StatsBar() {
  return (
    <section className="bg-[#f7f6f3] border-y border-[#e8e7e3] py-12">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "GitHub Stars", display: <Counter to={2400} suffix="+" /> },
            { label: "Models supported", display: <Counter to={40} suffix="+" /> },
            { label: "Avg cost per query", display: <span>$0.0009</span> },
            { label: "Monthly subscription", display: <span>$0</span> },
          ].map(({ label, display }) => (
            <div key={label} className="text-center">
              <div className="text-[2rem] font-bold text-[#1e1e1e] tracking-tight mb-1">{display}</div>
              <div className="text-[13px] text-[#787774]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Mini demo panel (right side of bento) ─── */
function MiniDemoPanel() {
  return (
    <div className="h-full flex flex-col" style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)" }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
        {/* Big circle icon */}
        <div className="w-16 h-16 rounded-full bg-[#5c5bd4] flex items-center justify-center shadow-lg">
          <Bot size={28} color="white" />
        </div>
        <div className="text-center">
          <h3 className="text-[20px] font-bold text-[#1e1e1e] mb-1">Workspace AI</h3>
          <p className="text-[13px] text-[#787774]">Answers questions using your Notion pages.</p>
        </div>
        {/* Fake chat input */}
        <div className="w-full max-w-xs bg-white rounded-xl border border-[#e8e7e3] shadow-sm">
          <div className="px-4 py-3 text-[13px] text-[#a4a3a1]">Ask, search, or make anything…</div>
          <div className="border-t border-[#e8e7e3] px-4 py-2.5 flex items-center justify-between">
            <div className="flex gap-3 text-[#a4a3a1]">
              <Plus size={15} />
              <SlidersHorizontal size={15} />
            </div>
            <div className="w-7 h-7 rounded-full bg-[#5c5bd4] flex items-center justify-center cursor-pointer">
              <ArrowRight size={13} color="white" />
            </div>
          </div>
        </div>
      </div>
      {/* Bottom pause button */}
      <div className="flex justify-end p-4">
        <div className="w-8 h-8 rounded-full border border-[#e8e7e3] bg-white flex items-center justify-center text-[#787774]">
          <div className="flex gap-0.5">
            <div className="w-[3px] h-[10px] bg-current rounded-full" />
            <div className="w-[3px] h-[10px] bg-current rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Features Bento ─── */
const agentList = [
  { icon: MessageSquare, label: "Q&A agents", color: "#f97316", bg: "#fff7ed" },
  { icon: Repeat2, label: "Task routing agents", color: "#8b5cf6", bg: "#f5f3ff" },
  { icon: BarChart3, label: "Reporting agents", color: "#10b981", bg: "#f0fdf4" },
  { icon: Plus, label: "Create your own", color: "#ec4899", bg: "#fdf2f8" },
];

const bottomCards = [
  { icon: FileText, label: "Summarize pages instantly", color: "#3b82f6", bg: "#dbeafe" },
  { icon: Layers, label: "Draft with any model", color: "#f97316", bg: "#fed7aa" },
  { icon: Search, label: "Answer workspace questions", color: "#10b981", bg: "#bbf7d0" },
  { icon: RefreshCw, label: "Automate weekly reporting", color: "#8b5cf6", bg: "#ede9fe" },
  { icon: Shield, label: "Build your own flow", color: "#ffffff", bg: "transparent", dark: true },
];

function FeaturesBento() {
  return (
    <section id="features" className="bg-[#f2f1ee] py-20">
      <div className="max-w-6xl mx-auto px-5">
        <p className="text-[13px] font-semibold text-[#a4a3a1] uppercase tracking-widest mb-3">AI Features</p>
        <h2 className="font-bold text-[#1e1e1e] tracking-tight mb-10" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
          Keep work moving 24/7.
        </h2>

        {/* Top bento row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left card */}
          <div className="bg-white rounded-2xl border border-[#e8e7e3] p-7 flex flex-col gap-6 min-h-[360px]">
            <div>
              <p className="text-[12px] font-semibold text-[#787774] uppercase tracking-wider mb-3">AI Capabilities</p>
              <h3 className="text-[20px] font-bold text-[#1e1e1e] leading-snug mb-4">
                Use any model.<br />Pay only for what you use.
              </h3>
              <Link href="/login" className="inline-flex w-9 h-9 rounded-full bg-[#1e1e1e] items-center justify-center hover:bg-[#5c5bd4] transition-colors">
                <ArrowRight size={16} color="white" />
              </Link>
            </div>
            <div className="flex flex-col gap-0">
              {agentList.map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className="flex items-center gap-3 py-3.5 border-b border-[#f0efea] last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon size={15} style={{ color }} strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-medium text-[#1e1e1e]">{label}</span>
                  <ChevronRight size={14} className="ml-auto text-[#a4a3a1]" />
                </div>
              ))}
              <p className="text-[12px] text-[#a4a3a1] mt-3">Connect your OpenRouter key to any workflow that repeats.</p>
            </div>
          </div>

          {/* Right demo card */}
          <div className="rounded-2xl border border-[#e8e7e3] overflow-hidden min-h-[360px]">
            <MiniDemoPanel />
          </div>
        </div>

        {/* Bottom cards row */}
        <p className="text-[12px] font-semibold text-[#a4a3a1] uppercase tracking-widest mb-4 mt-2">
          See what NotionAI OSS can do
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {bottomCards.map(({ icon: Icon, label, color, bg, dark }) => (
            <div
              key={label}
              className={cn(
                "rounded-2xl border p-5 flex flex-col gap-3 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                dark ? "bg-[#0f0f23] border-[#1e1e3f]" : "bg-white border-[#e8e7e3]"
              )}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: dark ? "rgba(92,91,212,0.3)" : bg }}
              >
                <Icon size={19} style={{ color: dark ? "#a5a4ff" : color }} strokeWidth={2} />
              </div>
              <p className={cn("text-[13px] font-semibold leading-snug", dark ? "text-white" : "text-[#1e1e1e]")}>
                {label} <span className={cn("inline-block transition-transform group-hover:translate-x-0.5", dark ? "text-[#a5a4ff]" : "text-[#5c5bd4]")}>→</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Check & Cross Icons ─── */
const CheckIcon = () => (
  <svg className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CrossIcon = () => (
  <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ─── How it works ─── */
const steps = [
  {
    num: "01",
    title: "Get the Source Code",
    description: "Clone the repository from GitHub. The codebase is fully open-source, MIT licensed, and easy to run locally or self-host on your own infrastructure.",
    highlights: ["MIT License", "Zero trackers", "Lightweight build"],
    theme: {
      border: "hover:border-blue-300 hover:shadow-[0_10px_30px_rgba(59,130,246,0.06)]",
      badge: "bg-[#eef2ff] text-blue-600 border-blue-100",
      bulletColor: "#3b82f6",
    }
  },
  {
    num: "02",
    title: "Insert Your API Key",
    description: "Provide your private OpenRouter token in the local configuration file. This allows the proxy server to direct requests to any model you choose.",
    highlights: ["40+ LLMs supported", "Pay-per-token model", "100% Data privacy"],
    theme: {
      border: "hover:border-purple-300 hover:shadow-[0_10px_30px_rgba(139,92,246,0.06)]",
      badge: "bg-[#f5f3ff] text-purple-600 border-purple-100",
      bulletColor: "#8b5cf6",
    }
  },
  {
    num: "03",
    title: "Launch & Connect",
    description: "Start the local server or deploy directly to the cloud. Log in with your Notion workspace OAuth credentials to start asking questions.",
    highlights: ["Vercel 1-click ready", "Sandbox preview mode", "Workspace context aware"],
    theme: {
      border: "hover:border-emerald-300 hover:shadow-[0_10px_30px_rgba(16,185,129,0.06)]",
      badge: "bg-[#ecfdf5] text-emerald-600 border-emerald-100",
      bulletColor: "#10b981",
    }
  },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-[#fcfcfa] border-y border-[#e8e7e3] py-24 relative overflow-hidden">
      {/* Background soft glow decoration */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-100/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-100/10 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-5 relative z-10">
        <div className="text-center mb-16">
          <p className="text-[13px] font-semibold text-[#5c5bd4] uppercase tracking-widest mb-3">Quick Setup</p>
          <h2 className="font-bold text-[#1e1e1e] tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            Up and running in 3 steps
          </h2>
          <p className="text-[16px] text-[#787774] max-w-md mx-auto">No account. No credit card. Just clone, configure, and go.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div 
              key={s.num} 
              className={cn(
                "bg-white rounded-2xl border border-[#e8e7e3] p-6.5 transition-all duration-300 hover:-translate-y-1.5 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col gap-4 min-h-[280px]",
                s.theme.border
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn("flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border select-none", s.theme.badge)}>
                  {s.num}
                </span>
                <h3 className="text-[16px] font-bold text-[#1e1e1e]">{s.title}</h3>
              </div>
              
              <p className="text-[13.5px] text-[#787774] leading-relaxed">
                {s.description}
              </p>
              
              <ul className="flex flex-col gap-2 mt-auto pt-4 border-t border-[#f0efea]">
                {s.highlights.map((h, hIdx) => (
                  <li key={hIdx} className="flex items-center gap-2 text-[12px] font-semibold text-[#37352f]">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.theme.bulletColor }} />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA Button at the bottom */}
        <div className="flex justify-center mt-14">
          <Link
            href="/tutorial"
            className="inline-flex items-center gap-2 text-[14px] font-bold text-white bg-[#1e1e1e] hover:bg-[#37352f] px-8 py-3 rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Read the Step-by-Step Tutorial <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Comparison table ─── */
const comparisonRows = [
  {
    feature: "AI access",
    notion: { text: "Notion AI plan ($10/mo)", isPositive: false },
    oss: { text: "Your OpenRouter key", isPositive: true, badge: "Pay-as-you-go", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100" }
  },
  {
    feature: "Models",
    notion: { text: "Notion-chosen only", isPositive: false },
    oss: { text: "GPT, Claude, Gemini, Llama…", isPositive: true, badge: "40+ Models", badgeColor: "bg-blue-50 text-blue-700 border-blue-100" }
  },
  {
    feature: "Cost",
    notion: { text: "$10–$20/mo flat fee", isPositive: false },
    oss: { text: "Pay per token used", isPositive: true, badge: "Cents/month", badgeColor: "bg-amber-50 text-amber-800 border-amber-100" }
  },
  {
    feature: "Source code",
    notion: { text: "Closed source", isPositive: false },
    oss: { text: "Open source (MIT)", isPositive: true, badge: "MIT License", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100" }
  },
  {
    feature: "Self-host",
    notion: { text: "No support", isPositive: false },
    oss: { text: "Yes, fully self-hostable", isPositive: true, badge: "Docker / Vercel ready", badgeColor: "bg-teal-50 text-teal-700 border-teal-100" }
  },
  {
    feature: "Data privacy",
    notion: { text: "Sent to Notion servers", isPositive: false },
    oss: { text: "Directly to provider key", isPositive: true, badge: "100% Private", badgeColor: "bg-purple-50 text-purple-700 border-purple-100" }
  },
];

function ComparisonTable() {
  return (
    <section id="pricing" className="bg-[#fcfcfa] border-b border-[#e8e7e3] py-24">
      <div className="max-w-4xl mx-auto px-5">
        <div className="text-center mb-16">
          <p className="text-[13px] font-semibold text-[#5c5bd4] uppercase tracking-widest mb-3">Cost & Feature Comparison</p>
          <h2 className="font-bold text-[#1e1e1e] tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            Notion AI vs. NotionAI OSS
          </h2>
          <p className="text-[16px] text-[#787774] max-w-md mx-auto">Compare features, limits, and pricing to see the difference.</p>
        </div>
        
        <div className="rounded-2xl border border-[#e8e7e3] overflow-hidden bg-white shadow-[0_12px_40px_rgba(0,0,0,0.03)]">
          {/* Table Header */}
          <div className="grid grid-cols-3 bg-[#f7f6f3] border-b border-[#e8e7e3] items-center">
            <div className="px-6 py-4.5 text-[12px] font-bold text-[#787774] uppercase tracking-wider">Feature</div>
            <div className="px-6 py-4.5 text-[12px] font-bold text-[#787774] uppercase tracking-wider border-l border-[#e8e7e3]">
              Notion AI
            </div>
            <div className="px-6 py-4.5 text-[12px] font-bold text-[#5c5bd4] uppercase tracking-wider border-l border-[#e8e7e3] bg-[#f0efff]/60 flex items-center justify-between">
              <span>This project</span>
              <span className="bg-[#5c5bd4] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full select-none tracking-wider">✦ RECOMMENDED</span>
            </div>
          </div>

          {/* Table Rows */}
          {comparisonRows.map((row, i) => (
            <div 
              key={row.feature} 
              className={cn(
                "grid grid-cols-3 border-b border-[#e8e7e3] last:border-0 items-center transition-colors duration-150 hover:bg-[#fcfcfa]",
                i % 2 === 1 ? "bg-[#fafaf9]/50" : "bg-white"
              )}
            >
              {/* Feature Title */}
              <div className="px-6 py-5 text-[13px] font-semibold text-[#1e1e1e]">
                {row.feature}
              </div>
              
              {/* Notion AI */}
              <div className="px-6 py-5 text-[13.5px] text-[#787774] border-l border-[#e8e7e3] flex items-center gap-2.5">
                <CrossIcon />
                <span>{row.notion.text}</span>
              </div>
              
              {/* This Project */}
              <div className="px-6 py-5 border-l border-[#e8e7e3] bg-[#f0efff]/15 h-full flex flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2.5">
                  <CheckIcon />
                  <span className="text-[13.5px] text-[#1e1e1e] font-semibold">{row.oss.text}</span>
                </div>
                {row.oss.badge && (
                  <span className={cn("inline-flex items-center w-fit text-[10.5px] font-bold px-2 py-0.5 rounded border leading-none ml-7 select-none", row.oss.badgeColor)}>
                    {row.oss.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
const faqs = [
  { q: "What is OpenRouter?", a: "OpenRouter is an API aggregator that gives you access to every major AI model — GPT-4o, Claude, Gemini, Llama — through one unified API. You pay per token, with no subscriptions or commitments." },
  { q: "Is my Notion data safe?", a: "Completely. Your API key sends requests directly to the model provider. NotionAI OSS never sees your prompts, stores your data, or logs any responses. Your key, your data." },
  { q: "Can I self-host this?", a: "Yes — that's the whole point. It's MIT licensed. Clone the repo, add your .env, and run npm run dev. No account required." },
  { q: "How much will I actually pay?", a: "Typical usage runs under $1/month. Gemini 2.5 Flash costs $0.075 per million tokens — a long AI conversation is a fraction of a cent. You only pay when you use it." },
  { q: "Does it feel like Notion AI?", a: "Yes. Same chat UX, same /ai slash commands in the editor, same workspace context awareness. If you use Notion AI today, you'll feel right at home." },
];

function FAQ() {
  return (
    <section id="faq" className="bg-white py-24">
      <div className="max-w-2xl mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="font-bold text-[#1e1e1e] tracking-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            Common questions
          </h2>
        </div>
        {faqs.map((f) => <Accordion key={f.q} q={f.q} a={f.a} />)}
      </div>
    </section>
  );
}

/* ─── CTA Banner ─── */
function CTABanner() {
  return (
    <section className="relative py-28 overflow-hidden border-t border-[#e8e7e3]">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 50%, #f0efff 0%, #ffffff 100%)",
      }} />
      <div className="relative max-w-2xl mx-auto px-5 text-center">
        <span className="text-[2.5rem] text-[#5c5bd4] block mb-6 select-none">✦</span>
        <h2 className="font-bold text-[#1e1e1e] tracking-tight mb-5" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
          Ready to ditch the subscription?
        </h2>
        <p className="text-[16px] text-[#787774] mb-8 leading-relaxed">
          Open source, MIT licensed, free to self-host. Or try it in the cloud — no card required.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 text-[15px] text-white bg-[#1e1e1e] hover:bg-[#37352f] px-7 py-2.5 rounded-full transition-colors font-medium shadow-sm">
            Start for free <ArrowRight size={15} />
          </Link>
          <a href="https://github.com" className="inline-flex items-center gap-2 text-[15px] text-[#1e1e1e] border border-[#e8e7e3] bg-white hover:bg-[#f7f6f3] px-7 py-2.5 rounded-full transition-colors font-medium">
            <Github size={15} /> View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-[#e8e7e3] bg-[#f7f6f3] py-8">
      <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[4px] bg-[#1e1e1e] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <path d="M2 2h7l3 3v7H2V2z" fill="white" fillOpacity="0.9"/>
              <path d="M9 2l3 3H9V2z" fill="white" fillOpacity="0.4"/>
            </svg>
          </div>
          <span className="text-[13px] text-[#787774]">NotionAI OSS — MIT License</span>
        </div>
        <div className="flex items-center gap-5 text-[13px] text-[#787774]">
          <a href="https://github.com" className="hover:text-[#1e1e1e] transition-colors flex items-center gap-1"><Github size={13} /> GitHub</a>
          <a href="https://openrouter.ai" className="hover:text-[#1e1e1e] transition-colors">OpenRouter</a>
          <Link href="/login" className="hover:text-[#1e1e1e] transition-colors">Login</Link>
        </div>
      </div>
    </footer>
  );
}

/* ─── Root ─── */
export default function App() {
  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Nav />
      <Hero />
      <StatsBar />
      <FeaturesBento />
      <HowItWorks />
      <ComparisonTable />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  );
}
