export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  createdAt: number;
}

export const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "HTML",
  "CSS",
  "Java",
  "C",
  "C++",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "SQL",
  "Shell",
  "JSON",
  "Markdown",
  "Plain Text",
] as const;

export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_MAP: Record<string, string> = {
  JavaScript: "javascript",
  TypeScript: "typescript",
  Python: "python",
  HTML: "xml",
  CSS: "css",
  Java: "java",
  C: "c",
  "C++": "cpp",
  Go: "go",
  Rust: "rust",
  Ruby: "ruby",
  PHP: "php",
  SQL: "sql",
  Shell: "bash",
  JSON: "json",
  Markdown: "markdown",
  "Plain Text": "plaintext",
};

export const EXTENSION_MAP: Record<string, string> = {
  JavaScript: "js",
  TypeScript: "ts",
  Python: "py",
  HTML: "html",
  CSS: "css",
  Java: "java",
  C: "c",
  "C++": "cpp",
  Go: "go",
  Rust: "rs",
  Ruby: "rb",
  PHP: "php",
  SQL: "sql",
  Shell: "sh",
  JSON: "json",
  Markdown: "md",
  "Plain Text": "txt",
};

export function getFileExtension(language: string): string {
  return EXTENSION_MAP[language] || "txt";
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-\u4e00-\u9fa5]/gi, "_").slice(0, 50) || "snippet";
}

const STORAGE_KEY = "code_snippets";

const HLJS_TO_LANGUAGE: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  xml: "HTML",
  css: "CSS",
  java: "Java",
  c: "C",
  cpp: "C++",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  sql: "SQL",
  bash: "Shell",
  json: "JSON",
  markdown: "Markdown",
  plaintext: "Plain Text",
};

export function detectLanguage(code: string): string {
  if (typeof window === "undefined") return "Plain Text";
  try {
    const hljs = require("highlight.js");
    const result = hljs.highlightAuto(code);
    if (result.language && result.relevance >= 5) {
      return HLJS_TO_LANGUAGE[result.language] || "Plain Text";
    }
  } catch {}
  return "Plain Text";
}

export function getSnippets(): Snippet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Snippet[]).map((s) => ({
      ...s,
      tags: s.tags || [],
    }));
  } catch {
    return [];
  }
}

export function saveSnippets(snippets: Snippet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

export function addSnippet(snippet: Omit<Snippet, "id" | "createdAt">): Snippet {
  const snippets = getSnippets();
  const newSnippet: Snippet = {
    ...snippet,
    tags: snippet.tags || [],
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  snippets.unshift(newSnippet);
  saveSnippets(snippets);
  return newSnippet;
}

export function updateSnippet(id: string, updates: Partial<Omit<Snippet, "id" | "createdAt">>): Snippet | null {
  const snippets = getSnippets();
  const index = snippets.findIndex((s) => s.id === id);
  if (index === -1) return null;
  snippets[index] = { ...snippets[index], ...updates };
  saveSnippets(snippets);
  return snippets[index];
}

export function deleteSnippet(id: string): void {
  const snippets = getSnippets().filter((s) => s.id !== id);
  saveSnippets(snippets);
}
