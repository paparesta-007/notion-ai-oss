import { notFound } from "next/navigation";
import { TUTORIAL_PAGES } from "@/lib/tutorialData";
import { OnThisPage } from "@/components/OnThisPage";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(TUTORIAL_PAGES).map((slug) => ({
    slug,
  }));
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Custom simple Icons for Alert blocks
const AlertInfoIcon = () => (
  <svg className="w-5 h-5 text-[#5c5bd4] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const AlertWarningIcon = () => (
  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const AlertSuccessIcon = () => (
  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default async function TutorialTopicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = TUTORIAL_PAGES[slug];

  if (!page) {
    notFound();
  }

  // Extract all headings for the scrollspy outline
  const headings = page.blocks
    .filter((b) => b.type === "heading2" || b.type === "heading3")
    .map((b) => ({
      type: b.type as "heading2" | "heading3",
      content: b.content as string,
    }));

  return (
    <div className="flex gap-10 px-6 md:px-12 py-10 max-w-5xl mx-auto w-full">
      {/* Center Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb path */}
        <span className="text-[13px] font-medium text-[#787774] mb-1.5 block select-none">
          {page.category}
        </span>
        
        {/* Header Title Toolbar */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-[36px] font-bold text-[#1e1e1e] tracking-tight leading-tight">
            {page.title}
          </h1>
          
          <button className="flex items-center gap-1.5 border border-[#e8e7e3] hover:bg-[#f7f6f3] text-[12px] font-medium text-[#37352f] px-2.5 py-1.5 rounded-md transition-colors shadow-sm select-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy page
          </button>
        </div>

        {/* Subtitle Description */}
        <p className="text-[16.5px] text-[#787774] leading-relaxed mb-8 border-b border-[#f1f1ef] pb-6">
          {page.description}
        </p>

        {/* Dynamic Blocks Rendering */}
        <div className="flex flex-col">
          {page.blocks.map((block, idx) => {
            switch (block.type) {
              case "paragraph":
                return (
                  <p key={idx} className="text-[16px] text-[#37352f] leading-7 mb-5">
                    {block.content}
                  </p>
                );
              case "heading2":
                return (
                  <h2
                    key={idx}
                    id={slugify(block.content as string)}
                    className="text-[23px] font-bold text-[#1e1e1e] tracking-tight mt-9 mb-4 border-b border-[#f0efea] pb-2 scroll-mt-20"
                  >
                    {block.content}
                  </h2>
                );
              case "heading3":
                return (
                  <h3
                    key={idx}
                    id={slugify(block.content as string)}
                    className="text-[19px] font-bold text-[#1e1e1e] tracking-tight mt-7 mb-3 scroll-mt-20"
                  >
                    {block.content}
                  </h3>
                );
              case "list":
                return (
                  <ul key={idx} className="list-none pl-0 mb-6 flex flex-col gap-2">
                    {(block.content as string[]).map((item, itemIdx) => (
                      <li key={itemIdx} className="relative pl-6 text-[15px] text-[#37352f] leading-relaxed">
                        <span className="absolute left-2 top-[10px] w-1.5 h-1.5 rounded-full bg-[#a4a3a1]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              case "code":
                return (
                  <div key={idx} className="rounded-xl overflow-hidden border border-[#e8e7e3] shadow-[0_4px_15px_rgba(0,0,0,0.01)] my-6">
                    <div className="bg-[#f7f6f3] px-4 py-2 flex items-center justify-between border-b border-[#e8e7e3] select-none">
                      <span className="text-[10.5px] font-mono text-[#787774] font-bold tracking-wider uppercase">
                        {block.language || "code"}
                      </span>
                      {/* Copy Code button */}
                      <button className="text-[#787774] hover:text-[#1e1e1e] transition-colors text-[11px] font-semibold flex items-center gap-1">
                        Copy
                      </button>
                    </div>
                    <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto"
                      style={{ background: "#fafaf9", color: "#37352f", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                      <code>{block.content}</code>
                    </pre>
                  </div>
                );
              case "alert":
                const alertStyle = 
                  block.alertType === "success" 
                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                    : block.alertType === "warning"
                    ? "bg-amber-50/40 border-amber-100 text-amber-800"
                    : "bg-[#f0efff]/40 border-[#c7c6ff] text-[#5c5bd4]";

                const AlertIcon = 
                  block.alertType === "success"
                    ? AlertSuccessIcon
                    : block.alertType === "warning"
                    ? AlertWarningIcon
                    : AlertInfoIcon;

                return (
                  <div key={idx} className={cn("rounded-xl p-4.5 border my-6 text-[15px] leading-relaxed flex gap-3", alertStyle)}>
                    <AlertIcon />
                    <div>{block.content}</div>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>

      {/* Right Table of Contents Sidebar */}
      <OnThisPage headings={headings} />
    </div>
  );
}
