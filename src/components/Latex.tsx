"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface LatexProps {
  math: string;
  block?: boolean;
}

export function Latex({ math, block = false }: LatexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch (error) {
      console.error("Error rendering LaTeX math:", error);
      return math;
    }
  }, [math, block]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
