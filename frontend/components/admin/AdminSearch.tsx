"use client";

import { useEffect, useState } from "react";

type SearchResult = {
  id: string;
  label: string;
  detail: string;
  href: string;
  kind: string;
};

export default function AdminSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch(
          `/api/admin/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        setResults(data.results || []);
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
          setOpen(true);
        }
      } finally {
        setBusy(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative min-w-0 sm:w-64 lg:w-72">
      <label htmlFor="admin-search" className="sr-only">
        Search users, courses, and lessons
      </label>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        id="admin-search"
        type="search"
        value={query}
        role="combobox"
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (value.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Search users, courses..."
        autoComplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="admin-search-results"
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />
      {open && (
        <>
          <button
            type="button"
            aria-label="Close search suggestions"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            id="admin-search-results"
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            {busy && (
              <p className="px-3 py-2 text-sm text-slate-500">Searching...</p>
            )}
            {!busy && results.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-500">
                No matching users, courses, or lessons.
              </p>
            )}
            {results.map((result) => (
              <a
                role="option"
                aria-selected="false"
                key={`${result.kind}-${result.id}`}
                href={result.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {result.label}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {result.kind}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {result.detail}
                </span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
