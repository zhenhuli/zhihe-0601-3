"use client";

import React, { useState, useRef } from "react";
import { LANGUAGES, Language, detectLanguage } from "../lib/snippets";
import CodeEditor from "./CodeEditor";

interface SnippetFormProps {
  onSubmit: (data: { title: string; language: string; code: string; tags: string[] }) => void;
}

export default function SnippetForm({ onSubmit }: SnippetFormProps) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<Language>("JavaScript");
  const [code, setCode] = useState("");
  const [tags, setTags] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAutoDetected = useRef(false);

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (!hasAutoDetected.current && value.trim().length > 20) {
      const detected = detectLanguage(value);
      if (detected !== "Plain Text") {
        setLanguage(detected as Language);
      }
      hasAutoDetected.current = true;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ title: title.trim(), language, code, tags: tagList });
    setTitle("");
    setLanguage("JavaScript");
    setCode("");
    setTags("");
    setIsExpanded(false);
    hasAutoDetected.current = false;
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        New Snippet
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">New Snippet</h2>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My awesome function"
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Tags
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="react, hook, util"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
          />
        </div>
      </div>

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Code <span className="text-red-500">*</span>
        </label>
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          language={language}
          placeholder="Paste your code here..."
          rows={8}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!title.trim() || !code.trim()}
        >
          Publish
        </button>
      </div>
    </form>
  );
}
