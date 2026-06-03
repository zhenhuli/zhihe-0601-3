"use client";

import React, { useRef, useCallback } from "react";
import hljs from "highlight.js";
import { LANGUAGE_MAP } from "../lib/snippets";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  placeholder?: string;
  rows?: number;
}

export default function CodeEditor({ value, onChange, language, placeholder, rows = 8 }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const hljsLang = LANGUAGE_MAP[language] || "plaintext";

  let highlighted = "";
  if (value) {
    try {
      if (hljsLang !== "plaintext") {
        highlighted = hljs.highlight(value, { language: hljsLang }).value;
      } else {
        highlighted = hljs.highlightAuto(value).value;
      }
    } catch {
      highlighted = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }
  highlighted += "\n";

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + "  " + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className="code-editor relative rounded-lg border border-zinc-300 dark:border-zinc-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-shadow">
      <pre
        ref={preRef}
        className="absolute inset-0 pointer-events-none overflow-auto m-0 rounded-lg"
        aria-hidden="true"
      >
        <code
          className={`language-${hljsLang} text-sm font-mono leading-6 whitespace-pre-wrap break-words [tab-size:2]`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="relative w-full bg-transparent text-transparent caret-white text-sm font-mono leading-6 border-0 m-0 resize-y focus:outline-none placeholder:text-zinc-500 whitespace-pre-wrap break-words [tab-size:2]"
      />
    </div>
  );
}
