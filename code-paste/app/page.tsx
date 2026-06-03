"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Snippet, getSnippets, addSnippet, deleteSnippet, updateSnippet } from "./lib/snippets";
import SnippetCard from "./components/SnippetCard";
import SnippetForm from "./components/SnippetForm";
import SnippetModal from "./components/SnippetModal";

export default function Home() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSnippets(getSnippets());
    setLoaded(true);
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    snippets.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [snippets]);

  const filteredSnippets = useMemo(() => {
    if (!activeTag) return snippets;
    return snippets.filter((s) => s.tags.includes(activeTag));
  }, [snippets, activeTag]);

  const handleAdd = (data: { title: string; language: string; code: string; tags: string[] }) => {
    const newSnippet = addSnippet(data);
    setSnippets((prev) => [newSnippet, ...prev]);
  };

  const handleDelete = (id: string) => {
    deleteSnippet(id);
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    if (selectedSnippet?.id === id) {
      setSelectedSnippet(null);
    }
  };

  const handleUpdate = (updated: Snippet) => {
    setSnippets((prev) => prev.map((s) => (s.id === updated.id ? updated : updated)));
    setSelectedSnippet(updated);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              CodePaste
            </h1>
          </div>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            {filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? "s" : ""}
            {activeTag ? ` tagged "${activeTag}"` : ""}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <SnippetForm onSubmit={handleAdd} />

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Tags</span>
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTag === null
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  activeTag === tag
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {!loaded ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {activeTag ? `No snippets tagged "${activeTag}"` : "No snippets yet"}
            </h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {activeTag ? "Try selecting a different tag or clear the filter." : "Click \"New Snippet\" above to create your first code snippet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSnippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                onClick={() => setSelectedSnippet(snippet)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {selectedSnippet && (
        <SnippetModal
          snippet={selectedSnippet}
          onClose={() => setSelectedSnippet(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
