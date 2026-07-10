"use client";

import React, { useEffect, useRef } from "react";
import Prism from "prismjs";
// Import common languages to guarantee highlighting is bundle-included
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      try {
        Prism.highlightElement(codeRef.current);
      } catch (err) {
        console.error("Error running Prism syntax highlight:", err);
      }
    }
  }, [code, language]);

  const cleanLang = language.toLowerCase() || "javascript";
  const langClass = `language-${cleanLang}`;

  return (
    <pre className="p-4 rounded-b-md overflow-x-auto font-mono text-sm leading-relaxed bg-[#1e1e1e] text-neutral-200 select-text">
      <code ref={codeRef} className={langClass}>
        {code}
      </code>
    </pre>
  );
}
