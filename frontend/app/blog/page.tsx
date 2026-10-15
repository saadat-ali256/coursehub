/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CourseHubLogo from "@/components/CourseHubLogo";
type BlogListingPost = {
  _id: string;
  slug: string;
  title: string;
  category?: string;
  coverImage?: string;
  excerpt?: string;
  createdAt: string;
  authorId?: { name?: string } | null;
};
export default function Blog() {
  const [posts, setPosts] = useState<BlogListingPost[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    fetch("/api/blog")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Could not load blog posts.");
        setPosts(d.posts || []);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Could not load blog posts."),
      );
  }, []);
  return (
    <main className="coursehub-page min-h-screen bg-[#f6f8fc]">
      <nav className="sticky top-0 z-40 border-b bg-white/90 px-5 py-4 backdrop-blur md:px-0">
        <div className="site-navbar-inner mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="navbar-wordmark text-2xl font-black"
          >
            <CourseHubLogo size="sm" />
          </button>
          <button
            onClick={() => router.push("/community/feed")}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Community
          </button>
        </div>
      </nav>
      <section className="desktop-content-width mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-14">
        <div className="max-w-3xl">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
            STUDY BLOG
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Learn smarter outside the classroom.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            Study guides, practical tips, career notes and course companion
            articles.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <button
              key={p._id}
              onClick={() => router.push(`/blog/${encodeURIComponent(p.slug)}`)}
              className="card group overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative grid h-44 place-items-end bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 p-6 text-left text-white">
                {p.coverImage && (
                  <Image
                    src={p.coverImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    fill
                    unoptimized
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <span className="relative z-10 w-full">
                  <span className="text-xs font-bold">{p.category}</span>
                  <span className="mt-2 block text-2xl font-black group-hover:underline">
                    {p.title}
                  </span>
                </span>
              </div>
              <span className="block p-6">
                <span className="block min-h-12 text-sm leading-6 text-slate-500">
                  {p.excerpt}
                </span>
                <span className="mt-5 block text-xs text-slate-400">
                  By {p.authorId?.name || "CourseHub"} •{" "}
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <span className="mt-4 block text-sm font-bold text-indigo-600">
                  Read article →
                </span>
              </span>
            </button>
          ))}
          {error && (
            <p role="alert" className="card p-6 text-sm text-rose-600 md:col-span-2 lg:col-span-3">
              {error}
            </p>
          )}
          {!posts.length && !error && (
            <div className="card p-10 text-slate-500 md:col-span-3">
              No published study articles yet. Admin can publish the first one
              from the Blog CMS.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
