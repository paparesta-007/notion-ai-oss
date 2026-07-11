import React from "react";
import { TutorialTopbar } from "@/components/TutorialTopbar";
import { TutorialSidebar } from "@/components/TutorialSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function TutorialLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white text-[#37352f] antialiased flex flex-col font-sans">
      {/* Top sticky header */}
      <TutorialTopbar />
      
      {/* Main body wrapper */}
      <div className="flex flex-1 w-full max-w-[1440px] mx-auto">
        {/* Left category/pages sidebar */}
        <TutorialSidebar />
        
        {/* Center / Right columns rendered dynamically by page router */}
        <main className="flex-1 min-w-0 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
