"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import CourseHubLoader, { CSpinner } from "@/components/CourseHubLoader";

type HeroSlide = {
  _id: string;
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  buttonLabel: string;
  buttonUrl: string;
  sortOrder: number;
  active: boolean;
};

type SlideForm = Omit<HeroSlide, "_id">;

const blankForm: SlideForm = {
  eyebrow: "",
  title: "",
  description: "",
  imageUrl: "",
  imageAlt: "",
  buttonLabel: "",
  buttonUrl: "",
  sortOrder: 0,
  active: true,
};

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [form, setForm] = useState<SlideForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [slideToDelete, setSlideToDelete] = useState<HeroSlide | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const loadSlides = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/hero-slides", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        slides?: HeroSlide[];
        message?: string;
      };
      if (response.status === 403) {
        setAccessDenied(true);
        throw new Error(data.message || "Admin access required.");
      }
      if (!response.ok)
        throw new Error(data.message || "Could not load hero slides.");
      setAccessDenied(false);
      setSlides(data.slides || []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load hero slides.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInitialSlides() {
      try {
        const response = await fetch("/api/admin/hero-slides", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          slides?: HeroSlide[];
          message?: string;
        };
        if (response.status === 403) {
          if (active) setAccessDenied(true);
          throw new Error(data.message || "Admin access required.");
        }
        if (!response.ok)
          throw new Error(data.message || "Could not load hero slides.");
        if (active) {
          setSlides(data.slides || []);
          setAccessDenied(false);
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load hero slides.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitialSlides();
    return () => {
      active = false;
    };
  }, []);

  function change<Key extends keyof SlideForm>(key: Key, value: SlideForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editSlide(slide: HeroSlide) {
    setEditingId(slide._id);
    setForm({
      eyebrow: slide.eyebrow || "",
      title: slide.title,
      description: slide.description || "",
      imageUrl: slide.imageUrl || "",
      imageAlt: slide.imageAlt || "",
      buttonLabel: slide.buttonLabel || "",
      buttonUrl: slide.buttonUrl || "",
      sortOrder: slide.sortOrder || 0,
      active: slide.active,
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(blankForm);
    setError("");
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Select an image file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Image must be 15 MB or smaller.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        url?: string;
        message?: string;
      };
      if (!response.ok || !data.url)
        throw new Error(data.message || "Image upload failed.");
      setForm((current) => ({
        ...current,
        imageUrl: data.url || "",
        imageAlt: current.imageAlt || file.name.replace(/\.[^.]+$/, ""),
      }));
      setNotice("Image uploaded. Save the slide to publish it.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/hero-slides", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          ...form,
          sortOrder: Number(form.sortOrder),
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        slide?: HeroSlide;
      };
      if (!response.ok)
        throw new Error(
          data.message ||
            `Could not ${editingId ? "update" : "create"} hero slide.`,
        );
      const savedSlide = data.slide;
      if (savedSlide) {
        setSlides((current) => {
          const exists = current.some(
            (slide) => slide._id === savedSlide._id,
          );
          return exists
            ? current.map((slide) =>
                slide._id === savedSlide._id ? savedSlide : slide,
              )
            : [...current, savedSlide].sort(
                (a, b) =>
                  a.sortOrder - b.sortOrder || a._id.localeCompare(b._id),
              );
        });
      }
      setForm(blankForm);
      setEditingId(null);
      setNotice(editingId ? "Hero slide updated." : "Hero slide added.");
      await loadSlides();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Could not ${editingId ? "update" : "create"} hero slide.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlide(slide: HeroSlide) {
    setDeletingId(slide._id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/hero-slides?id=${encodeURIComponent(slide._id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message || "Could not delete hero slide.");
      if (editingId === slide._id) cancelEdit();
      setNotice("Hero slide deleted.");
      setSlideToDelete(null);
      await loadSlides();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete hero slide.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (accessDenied)
    return (
      <main className="admin-workspace min-h-screen bg-slate-50 p-5 sm:p-8">
        <section className="card mx-auto mt-12 max-w-lg p-7 text-center">
          <h1 className="text-xl font-black text-slate-900">
            Administrator access required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with an administrator account to manage homepage slides.
          </p>
          <a
            href="/login?next=%2Fadmin%2Fhero-slides"
            className="mt-5 inline-flex rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white"
          >
            Sign in
          </a>
        </section>
      </main>
    );

  return (
    <main className="admin-workspace min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <a
              href="/admin"
              className="text-sm font-bold text-indigo-700 hover:text-indigo-900"
            >
              ← Admin workspace
            </a>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Homepage hero slides
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add text and images for the homepage spotlight. Active slides
              rotate every three seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSlides()}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
          >
            {loading ? <><CSpinner className="coursehub-loader__mark--small" /> Refreshing...</> : "Refresh slides"}
          </button>
        </header>

        {error && (
          <p
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            role="status"
          >
            {notice}
          </p>
        )}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <form onSubmit={save} className="card space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingId ? "Edit slide" : "Add a slide"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add text, an optional image, and an optional button.
              </p>
            </div>

            <div>
              <label
                htmlFor="hero-eyebrow"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Small heading
              </label>
              <input
                id="hero-eyebrow"
                maxLength={80}
                value={form.eyebrow}
                onChange={(event) => change("eyebrow", event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="hero-title"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Main text
              </label>
              <input
                id="hero-title"
                maxLength={140}
                required
                value={form.title}
                onChange={(event) => change("title", event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="hero-description"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Supporting text
              </label>
              <textarea
                id="hero-description"
                maxLength={360}
                rows={3}
                value={form.description}
                onChange={(event) => change("description", event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label
                  htmlFor="hero-image-file"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Spotlight image
                </label>
                <input
                  id="hero-image-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(event) => {
                    void uploadImage(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG, or WebP; up to 15 MB.
                </p>
              </div>
              <div>
                <label
                  htmlFor="hero-image-url"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Or image URL
                </label>
                <input
                  id="hero-image-url"
                  type="text"
                  value={form.imageUrl}
                  onChange={(event) => change("imageUrl", event.target.value)}
                  placeholder="/uploads/image.webp or https://example.com/image.webp"
                  className="w-full rounded-xl border px-4 py-3"
                />
                <input
                  aria-label="Image URL path"
                  type="hidden"
                  value={form.imageUrl.startsWith("/") ? form.imageUrl : ""}
                  readOnly
                />
                {form.imageUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    {/* Admin preview for the image selected or uploaded above. */}
                    <Image
                      src={form.imageUrl}
                      alt={form.imageAlt || "Hero slide preview"}
                      className="h-16 w-24 rounded-lg border border-slate-200 object-cover"
                      width={96}
                      height={64}
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => {
                        change("imageUrl", "");
                        change("imageAlt", "");
                      }}
                      className="text-sm font-semibold text-red-700 hover:text-red-900"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="hero-image-alt"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Image description
                </label>
                <input
                  id="hero-image-alt"
                  maxLength={180}
                  value={form.imageAlt}
                  onChange={(event) => change("imageAlt", event.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="hero-button-label"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Button text (optional)
                </label>
                <input
                  id="hero-button-label"
                  maxLength={48}
                  value={form.buttonLabel}
                  onChange={(event) => change("buttonLabel", event.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
              <div>
                <label
                  htmlFor="hero-button-url"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Button link
                </label>
                <input
                  id="hero-button-url"
                  value={form.buttonUrl}
                  onChange={(event) => change("buttonUrl", event.target.value)}
                  placeholder="/courses or https://…"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="hero-sort-order"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Display order
                </label>
                <input
                  id="hero-sort-order"
                  type="number"
                  min={0}
                  step={1}
                  value={form.sortOrder}
                  onChange={(event) =>
                    change("sortOrder", Number(event.target.value))
                  }
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
              <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => change("active", event.target.checked)}
                  className="h-4 w-4 accent-indigo-700"
                />
                Show on homepage
              </label>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={saving || uploading || deletingId !== null}
                className="min-w-36 flex-1 rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {uploading
                  ? "Uploading image…"
                  : saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Add slide"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving || uploading}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <section aria-labelledby="hero-slides-list">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="hero-slides-list"
                  className="text-lg font-extrabold text-slate-900"
                >
                  Slides
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Active slides rotate on the homepage every 3 seconds.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">
                {slides.filter((slide) => slide.active).length} active
              </span>
            </div>
            {loading ? (
              <CourseHubLoader label="Loading slides..." className="card" />
            ) : slides.length === 0 ? (
              <div className="card p-8 text-center">
                <h3 className="font-bold text-slate-900">No hero slides yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Add a slide to replace the default course spotlight.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {slides.map((slide) => (
                  <article className="card overflow-hidden" key={slide._id}>
                    {slide.imageUrl && (
                      <Image
                        src={slide.imageUrl}
                        alt={slide.imageAlt || ""}
                        className="h-36 w-full bg-slate-100 object-cover"
                        width={960}
                        height={288}
                        unoptimized
                      />
                    )}
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {slide.eyebrow && (
                              <span className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                                {slide.eyebrow}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${slide.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                            >
                              {slide.active ? "Active" : "Hidden"}
                            </span>
                          </div>
                          <h3 className="mt-2 break-words text-lg font-black text-slate-900">
                            {slide.title}
                          </h3>
                          {slide.description && (
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {slide.description}
                            </p>
                          )}
                          {(slide.buttonLabel || slide.buttonUrl) && (
                            <p className="mt-2 break-all text-xs text-slate-500">
                              Button: {slide.buttonLabel} → {slide.buttonUrl}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          Order {slide.sortOrder}
                        </span>
                      </div>
                      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => editSlide(slide)}
                          disabled={saving || uploading || deletingId !== null}
                          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setSlideToDelete(slide);
                          }}
                          disabled={saving || uploading || deletingId !== null}
                          className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === slide._id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      {slideToDelete && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) {
              setSlideToDelete(null);
              setError("");
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-slide-title"
            aria-describedby="delete-slide-description"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !deletingId) {
                setSlideToDelete(null);
                setError("");
              }
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-slide-title" className="text-lg font-black text-slate-900">
              Delete hero slide?
            </h2>
            <p id="delete-slide-description" className="mt-2 text-sm text-slate-600">
              “{slideToDelete.title}” will be permanently deleted.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                disabled={Boolean(deletingId)}
                onClick={() => {
                  setSlideToDelete(null);
                  setError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void deleteSlide(slideToDelete)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {deletingId === slideToDelete._id ? "Deleting..." : "Delete slide"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
