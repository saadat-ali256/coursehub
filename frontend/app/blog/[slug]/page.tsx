"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";

type BlogPost = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  createdAt: string;
  authorId?: { name?: string } | null;
};

type SuggestedLesson = {
  _id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  thumbnail?: string;
  duration?: number;
};

export default function BlogArticle() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug || "");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedLesson[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog?slug=${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load article.");
        setPost(data.post);
        setSuggestions(data.suggestions || []);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Could not load article."),
      );
  }, [slug]);

  return (
    <main className="coursehub-page min-h-screen bg-[#f6f8fc] text-slate-900">
      <nav className="sticky top-0 z-40 border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-5 md:px-0">
        <div className="site-navbar-inner mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button onClick={() => router.push("/")} className="navbar-wordmark shrink-0 text-xl font-black sm:text-2xl">
            <CourseHubLogo size="sm" />
          </button>
          <button
            onClick={() => router.push("/blog")}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 sm:px-4"
          >
            ← <span className="hidden sm:inline">All articles</span><span className="sm:hidden">Blog</span>
          </button>
        </div>
      </nav>
      {error ? (
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p role="alert" className="text-rose-600">{error}</p>
          <button onClick={() => router.push("/blog")} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">
            Browse blog
          </button>
        </section>
      ) : post ? (
        <article className="mx-auto max-w-4xl px-4 py-8 sm:py-14">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={`${post.title} cover`}
              className="mb-8 max-h-[480px] w-full rounded-3xl object-cover shadow-sm"
              width={1280}
              height={480}
              unoptimized
            />
          ) : (
            <div className="mb-8 grid h-48 place-items-center rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-5xl text-white sm:h-72">
              📚
            </div>
          )}
          <div className="mx-auto max-w-3xl">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {post.category || "Study"}
            </span>
            <h1 className="mt-5 break-words text-3xl font-black tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-5 text-lg leading-8 text-slate-500">{post.excerpt}</p>
            )}
            <p className="mt-4 text-sm text-slate-400">
              By {post.authorId?.name || "CourseHub"} · {new Date(post.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-8 space-y-5 border-t pt-8 text-base leading-8 text-slate-700 sm:text-lg">
              {post.content.split(/\r?\n/).filter(Boolean).map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 20)}`} className="whitespace-pre-wrap break-words">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          {suggestions.length > 0 && (
            <section className="mx-auto mt-12 max-w-4xl">
              <h2 className="text-2xl font-black">More in {post.category}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Videos and lessons related to this article.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((lesson) => (
                  <button
                    key={lesson._id}
                    onClick={() => router.push(`/courses/${lesson.courseId}`)}
                    className="overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {lesson.thumbnail ? (
                      <Image
                        src={lesson.thumbnail}
                        alt=""
                        className="h-40 w-full object-cover"
                        width={640}
                        height={160}
                        unoptimized
                      />
                    ) : (
                      <div className="grid h-40 place-items-center bg-gradient-to-br from-indigo-600 to-cyan-500 text-4xl text-white">
                        ▶
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-xs font-bold text-indigo-600">
                        {lesson.courseName}
                      </p>
                      <h3 className="mt-1 font-bold">{lesson.title}</h3>
                      {lesson.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {lesson.description}
                        </p>
                      )}
                      {lesson.duration ? (
                        <p className="mt-3 text-xs text-slate-400">
                          {lesson.duration} min
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </article>
      ) : (
        <CourseHubLoader label="Loading article..." className="mx-auto max-w-3xl py-20" />
      )}
    </main>
  );
}
