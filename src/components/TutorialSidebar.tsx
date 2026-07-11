"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorialData";

export function TutorialSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-[#e8e7e3] h-[calc(100vh-3.5rem)] overflow-y-auto sticky top-14 bg-white hidden md:block select-none scrollbar-thin">
      <div className="p-5 flex flex-col gap-6">
        {TUTORIAL_CATEGORIES.map((category) => (
          <div key={category.id} className="flex flex-col gap-1.5">
            {/* Category Header */}
            <h4 className="text-[12px] font-bold text-[#a4a3a1] uppercase tracking-wider px-2">
              {category.title}
            </h4>
            {/* Pages List */}
            <ul className="flex flex-col gap-0.5">
              {category.pages.map((page) => {
                const href = `/tutorial/${page.id}`;
                const isActive = pathname === href;

                return (
                  <li key={page.id}>
                    <Link
                      href={href}
                      className={cn(
                        "text-[14px] px-2.5 py-1.5 rounded-md flex items-center gap-2 transition-colors w-full text-left",
                        isActive
                          ? "bg-[#f0efea] text-[#1e1e1e] font-semibold"
                          : "text-[#787774] hover:bg-[#f7f6f3] hover:text-[#1e1e1e]"
                      )}
                    >
                      <span>{page.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
