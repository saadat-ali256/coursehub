"use client";

import { useEffect, useState } from "react";

type Category = { _id: string; name: string };

export default function CategoryPicker({
  value,
  onChange,
  required = true,
  label = "Category",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Could not load categories.");
        setCategories(data.categories || []);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load categories.",
        ),
      );
  }, []);

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Could not create category.");
      setCategories((current) =>
        [...current.filter((item) => item._id !== data.category._id), data.category]
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
      onChange(data.category.name);
      setNewCategory("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create category.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        {label}
        <select
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border bg-white px-4 py-3"
        >
          <option value="">Select category first</option>
          {value && !categories.some((category) => category.name === value) && (
            <option value={value}>{value}</option>
          )}
          {categories.map((category) => (
            <option key={category._id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <form onSubmit={addCategory} className="flex gap-2">
        <input
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          maxLength={50}
          placeholder="Add a category"
          className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!newCategory.trim() || saving}
          className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
