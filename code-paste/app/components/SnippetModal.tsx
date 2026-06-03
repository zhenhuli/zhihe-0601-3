"use client";

import React, { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import { Snippet, LANGUAGE_MAP, LANGUAGES, Language, detectLanguage, updateSnippet, getFileExtension, sanitizeFilename } from "../lib/snippets";
import CodeEditor from "./CodeEditor";

interface SnippetModalProps {
  snippet: Snippet;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (snippet: Snippet) => void;
}

export default function SnippetModal({ snippet, onClose, onDelete, onUpdate }: SnippetModalProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(snippet.title);
  const [editLanguage, setEditLanguage] = useState<Language>(snippet.language as Language);
  const [editCode, setEditCode] = useState(snippet.code);
  const [editTags, setEditTags] = useState(snippet.tags.join(", "));
  const hasAutoDetectedEdit = useRef(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const PREVIEW_LINES = 20;
  const codeLines = snippet.code.split("\n").length;
  const needsExpansion = codeLines > PREVIEW_LINES;

  useEffect(() => {
    if (!isEditing && codeRef.current) {
      codeRef.current.removeAttribute("data-highlighted");
      hljs.highlightElement(codeRef.current);
    }
  }, [snippet, isEditing, isExpanded]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(snippet.title);
      setEditLanguage(snippet.language as Language);
      setEditCode(snippet.code);
      setEditTags(snippet.tags.join(", "));
      hasAutoDetectedEdit.current = true;
    }
  }, [isEditing, snippet]);

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(snippet.id);
      onClose();
    } else {
      setConfirmDelete(true);
    }
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editCode.trim()) return;
    const tagList = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const updated = updateSnippet(snippet.id, {
      title: editTitle.trim(),
      language: editLanguage,
      code: editCode,
      tags: tagList,
    });
    if (updated) {
      onUpdate(updated);
    }
    setIsEditing(false);
  };

  const handleEditCodeChange = (value: string) => {
    setEditCode(value);
    if (!hasAutoDetectedEdit.current && value.trim().length > 20) {
      const detected = detectLanguage(value);
      if (detected !== "Plain Text") {
        setEditLanguage(detected as Language);
      }
      hasAutoDetectedEdit.current = true;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleExport = () => {
    const ext = getFileExtension(snippet.language);
    const filename = `${sanitizeFilename(snippet.title)}.${ext}`;
    const blob = new Blob([snippet.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hljsLang = LANGUAGE_MAP[snippet.language] || "plaintext";

  const getDisplayCode = () => {
    if (isExpanded || !needsExpansion) return snippet.code;
    return snippet.code.split("\n").slice(0, PREVIEW_LINES).join("\n") + "\n...";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
              />
            ) : (
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {snippet.title}
              </h2>
            )}
            {isEditing ? (
              <select
                value={editLanguage}
                onChange={(e) => setEditLanguage(e.target.value as Language)}
                className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            ) : (
              <span className="shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {snippet.language}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing && (
              <>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                  title="复制代码"
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-emerald-500">已复制</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                      复制
                    </>
                  )}
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-1.5"
                  title={`导出为 .${getFileExtension(snippet.language)} 文件`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  导出
                </button>
              </>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editTitle.trim() || !editCode.trim()}
                  className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    confirmDelete
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  }`}
                >
                  {confirmDelete ? "确认删除" : "删除"}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tags
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="react, hook, util"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
                />
              </div>
              <CodeEditor
                value={editCode}
                onChange={handleEditCodeChange}
                language={editLanguage}
                rows={16}
              />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                {needsExpansion && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-zinc-800/90 dark:bg-zinc-700/90 text-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors backdrop-blur-sm flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        收起
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        展开全部
                      </>
                    )}
                  </button>
                )}
              </div>
              <pre className={`rounded-xl overflow-auto text-sm leading-relaxed ${isExpanded || !needsExpansion ? "" : "max-h-96 overflow-hidden"}`}>
                <code ref={codeRef} className={`language-${hljsLang}`}>
                  {getDisplayCode()}
                </code>
              </pre>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          {!isEditing && snippet.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {snippet.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <span className="text-xs text-zinc-400 ml-auto">
            Created at {new Date(snippet.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
