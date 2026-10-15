/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";
interface Course {
  _id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  category?: string;
  level?: string;
  instructor?: string;
  thumbnail?: string;
}
interface Lesson {
  _id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  type?: string;
  duration?: number;
  videoUrl?: string;
  thumbnail?: string;
}
interface Comment {
  _id: string;
  text: string;
  createdAt: string;
  userId?: {
    name: string;
  };
}
interface LessonProgress {
  lessonId: string;
  position?: number;
  completed: boolean;
  updatedAt: string;
}
interface CourseUser {
  _id: string;
  name?: string;
}
function yt(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.searchParams.get("v"))
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    return url;
  } catch {
    return url;
  }
}
function isYT(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}
export default function CoursePage() {
  const { id } = useParams();
  const router = useRouter();
  const courseId = String(id);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [user, setUser] = useState<CourseUser | null>(null);
  const [selected, setSelected] = useState(0);
  const [resumePoint, setResumePoint] = useState<{
    lessonId: string;
    position: number;
  } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [visibleCommentCount, setVisibleCommentCount] = useState(10);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const lastProgressSentAt = useRef<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      try {
        const [cr, me] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch("/api/auth/me"),
        ]);
        const c = await cr.json();
        if (!cr.ok || !c.success)
          throw new Error(c.message || "Course could not be found.");
        const canonicalCourseId = String(c.course._id);
        if (canonicalCourseId !== courseId) {
          router.replace(`/courses/${encodeURIComponent(canonicalCourseId)}`);
          return;
        }
        const [m, access] = await Promise.all([me.json(), fetch(`/api/courses/${canonicalCourseId}/access`)]);
        const a = await access.json();
        if (!access.ok && access.status !== 401) {
          throw new Error(a.message || "Could not verify course access.");
        }
        if (!a.hasAccess) {
          router.replace(
            `/subscriptions?next=${encodeURIComponent(`/courses/${canonicalCourseId}`)}`,
          );
          return;
        }
        const [ls, cm, rt, likeResponse] = await Promise.all([
          fetch(`/api/courses/${canonicalCourseId}/lessons`),
          fetch(`/api/courses/${canonicalCourseId}/comments`),
          fetch(`/api/courses/${canonicalCourseId}/rating`),
          fetch(`/api/courses/${canonicalCourseId}/like`),
        ]);
        const [l, cc, rr, lk] = await Promise.all([
          ls.json(),
          cm.json(),
          rt.json(),
          likeResponse.json(),
        ]);
        setCourse(c.course);
        setUser(m.user || null);
        setHasAccess(!!a.hasAccess);
        setLessons(l.lessons || []);
        setComments(cc.comments || []);
        setAvg(rr.average || 0);
        setCount(rr.count || 0);
        setLiked(!!lk.liked);
        setLikes(lk.count || 0);
        if (a.hasAccess) {
          const progressResponse = await fetch(
            `/api/learning/progress?courseId=${encodeURIComponent(canonicalCourseId)}`,
          );
          const progressData = (await progressResponse.json()) as {
            success: boolean;
            message?: string;
            progress: LessonProgress[];
          };
          if (!progressResponse.ok || !progressData.success) {
            throw new Error(progressData.message || "Could not load lesson progress.");
          }
          const courseProgress = progressData.progress || [];
          const recentProgress = [...courseProgress].sort(
            (first, second) =>
              new Date(second.updatedAt).getTime() -
              new Date(first.updatedAt).getTime(),
          );
          const resumeProgress =
            recentProgress.find((item) => !item.completed) || recentProgress[0];
          if (resumeProgress) {
            const lessonIndex = (l.lessons || []).findIndex(
              (item: Lesson) => item._id === resumeProgress.lessonId,
            );
            if (lessonIndex >= 0) {
              setSelected(lessonIndex);
              setResumePoint({
                lessonId: resumeProgress.lessonId,
                position: Number(resumeProgress.position) || 0,
              });
            }
          }
        }
      } catch (error) {
        console.error("Could not load course or check its access.", error);
        setLoadError(
          "Please check your connection and try again. Course access is only enabled after a subscription is confirmed.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, router]);
  const lesson = lessons[selected];
  const progress = lessons.length
    ? Math.round(((selected + 1) / lessons.length) * 100)
    : 0;
  async function saveLessonProgress(
    position: number,
    duration: number,
    completed = false,
  ) {
    if (!lesson || !hasAccess) return;
    const response = await fetch("/api/learning/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lesson._id,
        position,
        duration,
        completed,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Could not save lesson progress.");
    }
  }
  function trackVideoProgress(
    video: HTMLVideoElement,
    completed = false,
    force = false,
  ) {
    if (!lesson) return;
    if (!completed && !force) {
      const now = Date.now();
      if (now - (lastProgressSentAt.current[lesson._id] || 0) < 15_000) {
        return;
      }
      lastProgressSentAt.current[lesson._id] = now;
    }
    void saveLessonProgress(
      video.currentTime,
      Number.isFinite(video.duration) ? video.duration : 0,
      completed,
    ).catch((error) => {
      console.error("Could not save video lesson progress.", error);
    });
  }
  function markLessonComplete() {
    const duration = Math.max(0, Number(lesson?.duration || 0) * 60);
    void saveLessonProgress(duration, duration, true).catch((error) => {
      console.error("Could not mark lesson complete.", error);
      setLoadError(
        error instanceof Error ? error.message : "Could not save lesson progress.",
      );
    });
  }
  async function postComment() {
    if (!comment.trim()) return;
    const r = await fetch(`/api/courses/${courseId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: comment,
      }),
    });
    const d = await r.json();
    if (r.ok) {
      setComments([d.comment, ...comments]);
      setComment("");
    } else if (r.status === 401) router.push("/login");
    else if (r.status === 403)
      router.push(
        `/subscriptions?next=${encodeURIComponent(`/courses/${courseId}`)}`,
      );
    else alert(d.message);
  }
  async function toggleLike() {
    const r = await fetch(`/api/courses/${courseId}/like`, {
      method: "POST",
    });
    const d = await r.json();
    if (r.status === 401) router.push("/login");
    else if (r.status === 403)
      router.push(
        `/subscriptions?next=${encodeURIComponent(`/courses/${courseId}`)}`,
      );
    else if (r.ok) {
      setLiked(d.liked);
      setLikes(d.count);
    }
  }
  async function saveRating() {
    if (!rating) return;
    const r = await fetch(`/api/courses/${courseId}/rating`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating,
      }),
    });
    if (r.status === 401) router.push("/login");
    else if (r.status === 403)
      router.push(
        `/subscriptions?next=${encodeURIComponent(`/courses/${courseId}`)}`,
      );
    else if (r.ok) {
      const rr = await fetch(`/api/courses/${courseId}/rating`).then((x) =>
        x.json(),
      );
      setAvg(rr.average);
      setCount(rr.count);
    }
  }
  if (loading)
    return (
      <CourseHubLoader fullScreen label="Loading course..." />
    );
  if (!course && loadError)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f4f8] px-5 text-center text-[#172033]">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-black">Course could not be loaded</h1>
          <p className="mt-3 text-sm text-slate-600">{loadError}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
          >
            Back to courses
          </button>
        </div>
      </main>
    );
  if (!course) return null;
  return (
    <main className="coursehub-page min-h-screen bg-[#f3f4f8] text-[#172033]">
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-4 py-4 md:px-[1in]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                window.history.length > 1 ? router.back() : router.push("/")
              }
              aria-label="Go back"
              title="Go back"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M19 12H5m0 0 7 7m-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={() => router.push("/")}
              className="navbar-wordmark text-2xl font-black"
            >
              <CourseHubLogo size="sm" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/blog")}
              className="hidden rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 md:block"
            >
              Study Blog
            </button>
            {user ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>
      <section className="w-full px-4 py-7 md:px-[1in]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="w-full overflow-hidden rounded-[28px] border border-indigo-200 bg-gradient-to-br from-[#101b40] via-[#28266f] to-indigo-700 shadow-xl shadow-indigo-950/15">
              <div className="aspect-video">
                {lesson?.videoUrl ? (
                  isYT(lesson.videoUrl) ? (
                    <iframe
                      key={lesson._id}
                      src={yt(lesson.videoUrl)}
                      className="h-full w-full bg-indigo-950"
                      allowFullScreen
                      title={lesson.title}
                    />
                  ) : (
                    <video
                      key={lesson._id}
                      src={lesson.videoUrl}
                      poster={lesson.thumbnail || undefined}
                      controls
                      playsInline
                      onLoadedMetadata={(event) => {
                        if (resumePoint?.lessonId === lesson._id) {
                          event.currentTarget.currentTime = Math.min(
                            resumePoint.position,
                            event.currentTarget.duration || resumePoint.position,
                          );
                        }
                      }}
                      onTimeUpdate={(event) =>
                        trackVideoProgress(event.currentTarget)
                      }
                      onPause={(event) =>
                        trackVideoProgress(event.currentTarget, false, true)
                      }
                      onEnded={(event) =>
                        trackVideoProgress(event.currentTarget, true)
                      }
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                      className="h-full w-full bg-indigo-950"
                    />
                  )
                ) : (
                  <div className="grid h-full place-items-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 text-indigo-100">
                    Admin has not added a video yet.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2 text-xs font-bold text-indigo-700">
                <span>Lesson {lesson ? selected + 1 : 0}</span>
                <span>•</span>
                <span>{lesson?.duration || 0} min</span>
                <span>•</span>
                <span>{hasAccess ? "FULL ACCESS" : "FREE PREVIEW"}</span>
              </div>
              <h1 className="mt-2 text-2xl font-black md:text-3xl">
                {lesson?.title || course.name}
              </h1>
              <p className="mt-3 leading-7 text-slate-600">
                {lesson?.description || course.description}
              </p>
              {lesson?.content && (
                <div className="mt-5 whitespace-pre-line border-t border-slate-200 pt-5 leading-7 text-slate-600">
                  {lesson.content}
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={markLessonComplete}
                  className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700"
                >
                  Mark lesson complete
                </button>
                <button
                  disabled={selected === 0}
                  onClick={() => setSelected((x) => x - 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  disabled={selected === lessons.length - 1}
                  onClick={() => setSelected((x) => x + 1)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-30"
                >
                  Next lesson →
                </button>
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">About this course</h2>
              <p className="mt-3 leading-7 text-slate-600">
                {course.description}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Level", course.level || "All levels"],
                  ["Instructor", course.instructor || "CourseHub"],
                  ["Lessons", String(lessons.length)],
                  ["Rating", `${avg || "New"} ★`],
                ].map(([a, b]) => (
                  <div key={a} className="rounded-2xl bg-indigo-50 p-4">
                    <div className="text-xs text-slate-500">{a}</div>
                    <div className="mt-1 font-bold text-slate-800">{b}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black">
                  Reviews, comments & reactions
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleLike}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${liked ? "border-pink-200 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-700"}`}
                  >
                    ♥ {likes}
                  </button>
                  <div className="text-amber-500">
                    ★ {avg || "—"}{" "}
                    <span className="text-xs text-slate-500">({count})</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`text-2xl ${rating >= n ? "text-amber-500" : "text-slate-300"}`}
                  >
                    ★
                  </button>
                ))}
                <button
                  onClick={saveRating}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
                >
                  Rate
                </button>
              </div>
              <div className="mt-5 flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts…"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-400"
                />
                <button
                  onClick={postComment}
                  className="rounded-xl bg-indigo-600 px-4 font-bold"
                >
                  Post
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {comments.slice(0, visibleCommentCount).map((c) => (
                  <div key={c._id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex justify-between">
                      <b>{c.userId?.name || "Learner"}</b>
                      <span className="text-xs text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {c.text}
                    </p>
                  </div>
                ))}
                {!comments.length && (
                  <p className="text-sm text-slate-500">
                    Be the first to comment.
                  </p>
                )}
                {visibleCommentCount < comments.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCommentCount((current) => current + 10)
                    }
                    className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    See more
                  </button>
                )}
              </div>
            </div>
          </div>
          <aside className="h-fit rounded-[28px] border border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
            <div className="border-b border-slate-200 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Course playlist
              </div>
              <h2 className="mt-1 text-xl font-black">{course.name}</h2>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>
                  {selected + 1}/{lessons.length || 1} lessons
                </span>
                <span>{progress}%</span>
              </div>
            </div>
            <div className="max-h-[62vh] overflow-y-auto p-2">
              {lessons.map((l, i) => {
                const locked = !hasAccess && i > 0;
                return (
                  <button
                    key={l._id}
                    onClick={() => {
                      if (locked) {
                        router.push(`/register?next=/courses/${courseId}`);
                        return;
                      }
                      setSelected(i);
                    }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-4 text-left ${i === selected ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-indigo-50"}`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-black ${i === selected ? "bg-white/15" : "bg-indigo-50 text-indigo-700"}`}>
                      {locked ? "🔒" : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{l.title}</span>
                      <span className={`mt-1 block text-xs ${i === selected ? "text-indigo-100" : "text-slate-500"}`}>
                        {l.duration || 0} min • {l.type || "video"}
                      </span>
                    </span>
                    {i === 0 && !hasAccess && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        FREE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!hasAccess && (
              <div className="border-t border-slate-200 p-5">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                  <div className="font-black">Unlock the full playlist</div>
                  <p className="mt-1 text-sm text-slate-600">
                    Subscribers get every lesson, progress tracking and
                    community access.
                  </p>
                  <button
                    onClick={() => router.push(`/courses/${courseId}/learn`)}
                    className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-black text-white"
                  >
                    Subscribe / Unlock
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="flex w-full flex-col justify-between gap-5 px-4 py-8 md:flex-row md:items-center md:px-[1in]">
          <div>
            <CourseHubLogo size="sm" light />
            <p className="mt-2 text-sm text-slate-400">
              Learn modern skills with a practical learning experience.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <Link href="/support" className="hover:text-white">
              Contact support
            </Link>
            <span>
              © {new Date().getFullYear()} CourseHub. Built for learning.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
