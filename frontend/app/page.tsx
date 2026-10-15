/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CourseHubLogo from "@/components/CourseHubLogo";
import { useAuth } from "@clerk/nextjs";
import CourseHubLoader from "@/components/CourseHubLoader";
import { syncCourseHubProfile } from "@/lib/sync-coursehub-profile";
interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
  adminPermissions?: string[];
  communityAccess?: boolean;
}
interface Course {
  _id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  category?: string;
  thumbnail?: string;
  featured?: boolean;
  createdAt?: string;
  level?: string;
  instructor?: string;
}

interface HeroSlide {
  _id: string;
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  buttonLabel: string;
  buttonUrl: string;
  sortOrder: number;
}

export default function Home() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [contentCategories, setContentCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showMoreCourses, setShowMoreCourses] = useState(false);
  const [showMorePinned, setShowMorePinned] = useState(false);
  const [certificateId, setCertificateId] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  function getDashboardPath() {
    const hasAdminAccess =
      user?.role === "admin" ||
      (user?.role === "subadmin" &&
        (user.adminPermissions || []).some((permission) =>
          ["manage_community", "moderate_feed", "manage_users"].includes(permission),
        ));
    return hasAdminAccess ? "/admin" : "/dashboard";
  }

  useEffect(() => {
    if (!mobileNavOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !mobileNavRef.current?.contains(event.target)
      ) {
        setMobileNavOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileNavOpen]);

  function openCourse(courseId: string) {
    const coursePath = `/courses/${encodeURIComponent(courseId)}`;
    if (!user?.communityAccess) {
      router.push(`/subscriptions?next=${encodeURIComponent(coursePath)}`);
      return;
    }
    router.push(coursePath);
  }
  useEffect(() => {
    if (!isLoaded) return;
    let active = true;

    async function loadHome() {
      try {
        const [courseResponse, categoryResponse] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/admin/categories"),
        ]);
        const [courseData, categoryData] = await Promise.all([
          courseResponse.json(),
          categoryResponse.json(),
        ]);
        let userData: { success?: boolean; user?: User; message?: string } | null =
          null;

        if (isSignedIn) {
          let userResponse = await fetch("/api/auth/me");
          let accountData: {
            success?: boolean;
            user?: User;
            message?: string;
          } = await userResponse.json();
          if (userResponse.status === 401) {
            await syncCourseHubProfile(getToken);
            userResponse = await fetch("/api/auth/me");
            accountData = await userResponse.json();
          }
          if (!userResponse.ok || !accountData.success) {
            throw new Error(
              accountData.message || "Could not load your CourseHub account.",
            );
          }
          userData = accountData;
        }

        if (!active) return;
        if (userData?.success && userData.user) setUser(userData.user);
        if (courseData.success) setCourses(courseData.courses);
        if (categoryData.success) {
          setContentCategories(
            categoryData.categories.map(
              (category: { name: string }) => category.name,
            ),
          );
        }
      } catch (error) {
        console.error("Could not load homepage account and course data.", error);
      } finally {
        if (active) {
          setAuthResolved(true);
          setLoading(false);
        }
      }
    }

    void loadHome();
    return () => {
      active = false;
    };
  }, [getToken, isLoaded, isSignedIn]);
  useEffect(() => {
    let disposed = false;

    async function refreshHeroSlides() {
      try {
        const response = await fetch("/api/hero-slides", {
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error("Could not load homepage hero slides.");
        const data = (await response.json()) as {
          slides?: HeroSlide[];
        };
        if (disposed) return;
        const slides = Array.isArray(data.slides) ? data.slides : [];
        setHeroSlides(slides);
        setHeroSlideIndex((index) =>
          slides.length ? index % slides.length : 0,
        );
      } catch (error) {
        if (!disposed)
          console.error("Could not load homepage hero slides.", error);
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshHeroSlides();
    }

    void refreshHeroSlides();
    const interval = window.setInterval(refreshWhenVisible, 15000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, []);
  useEffect(() => {
    if (heroSlides.length < 2 || heroPaused) return;
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (motionPreference.matches) return;

    const interval = window.setInterval(() => {
      setHeroSlideIndex((index) => (index + 1) % heroSlides.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [heroPaused, heroSlides.length]);
  const filtered = courses.filter(
    (c) =>
      (cat === "All" ||
        c.category === cat) &&
      (c.name + " " + c.description).toLowerCase().includes(q.toLowerCase()),
  );
  const activeHeroSlide =
    heroSlides.length > 0
      ? heroSlides[heroSlideIndex % heroSlides.length]
      : null;
  const availableCategories = [
    "All",
    ...new Set([
      ...contentCategories,
      ...courses
        .map((course) => course.category)
        .filter((category): category is string => Boolean(category)),
    ]),
  ];
  return (
    <main>
      <nav className="glass sticky top-0 z-50">
        <div className="container site-navbar-inner flex flex-col gap-2 py-2 sm:gap-0 sm:py-4">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <button
              onClick={() => router.push("/")}
              className="navbar-wordmark shrink-0 text-2xl font-black tracking-tight"
            >
              <CourseHubLogo size="sm" />
            </button>
            <div className="hidden items-center gap-5 text-sm font-medium text-slate-600 xl:flex">
              <a href="#courses" className="hover:text-indigo-700">Courses</a>
              <a href="#why" className="hover:text-indigo-700">Why us</a>
              <a href="#certificate-verification" className="hover:text-indigo-700">Verify certificate</a>
              <a href="#faq" className="hover:text-indigo-700">FAQ</a>
              <Link href="/blog" className="hover:text-indigo-700">Study Blog</Link>
              <Link href="/community/feed" className="hover:text-indigo-700">Community</Link>
              <Link href="/premium" className="font-bold text-indigo-700 hover:text-indigo-900">
                Premium
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {authResolved && user && (
                <button
                  onClick={() => router.push(getDashboardPath())}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white sm:px-4 sm:py-2.5"
                >
                  Dashboard
                </button>
              )}
              {!authResolved ? (
                <span
                  aria-live="polite"
                  className="px-3 py-2 text-sm text-slate-500"
                >
                  Checking session…
                </span>
              ) : user ? (
                <div ref={mobileNavRef} className="relative xl:hidden">
                  <button
                    type="button"
                    aria-label="Open navigation"
                    aria-expanded={mobileNavOpen}
                    aria-controls="mobile-home-menu"
                    onClick={() => setMobileNavOpen((open) => !open)}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                  >
                    <span className="sr-only">Open navigation</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {mobileNavOpen && (
                    <div
                      id="mobile-home-menu"
                      className="absolute right-0 top-full z-50 mt-2 grid w-48 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                    >
                      <a
                        href="#courses"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Courses
                      </a>
                      <a
                        href="#why"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Why us
                      </a>
                      <a
                        href="#faq"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        FAQ
                      </a>
                      <a
                        href="#certificate-verification"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Verify certificate
                      </a>
                      <Link
                        href="/blog"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Study Blog
                      </Link>
                      <Link
                        href="/community/feed"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Community
                      </Link>
                      <Link
                        href="/premium"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Premium
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/login")}
                    className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 sm:inline-flex sm:px-4 sm:py-2.5"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push("/register")}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 sm:px-4 sm:py-2.5"
                  >
                    Get started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <section className="hero-glow grid-bg overflow-hidden">
        <div className="container grid min-h-0 items-center gap-8 py-10 sm:py-14 md:grid-cols-[1.08fr_.92fr] md:gap-6 lg:min-h-[650px] lg:gap-12 lg:py-20">
          <div>
            <div className="mb-3 text-sm font-bold text-slate-500">
              {user
                ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${(user.name || "learner").split(" ")[0]} 👋`
                : "Welcome to CourseHub 👋"}
            </div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm">
              ✦ Learn. Build. Grow.
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.03] tracking-[-.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Master skills that{" "}
              <span className="gradient-text">move your career forward.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              Practical, focused courses designed to help you build real
              projects, understand modern tools, and keep progressing.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                onClick={() =>
                  user
                    ? document.getElementById("courses")?.scrollIntoView({
                        behavior: "smooth",
                      })
                    : router.push("/login")
                }
                className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 font-bold text-white shadow-xl shadow-indigo-200"
              >
                {user ? "Explore courses →" : "Login to explore →"}
              </button>
              <button
                onClick={() => router.push(user ? "/dashboard" : "/register")}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-800"
              >
                {user ? "Continue learning" : "Start learning free"}
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-7 text-sm text-slate-500">
              <span>✓ Self-paced</span>
              <span>✓ Project focused</span>
              <span>✓ Learn anywhere</span>
            </div>
          </div>
          <div
            className="relative mx-auto min-h-[430px] w-full sm:min-h-[470px]"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocusCapture={() => setHeroPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setHeroPaused(false);
            }}
          >
            <div className="absolute -inset-4 rounded-[48px] bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-cyan-400/20 blur-3xl" />
            {activeHeroSlide ? (
              <>
                <article
                  key={activeHeroSlide._id}
                  aria-label={`Homepage feature ${heroSlideIndex + 1} of ${heroSlides.length}`}
                  aria-live="off"
                  className="hero-spotlight-content absolute inset-0 z-10 mx-auto h-[430px] w-full overflow-hidden bg-transparent shadow-none sm:h-[470px]"
                >
                  {activeHeroSlide.imageUrl && (
                    <Image
                      src={activeHeroSlide.imageUrl}
                      alt={activeHeroSlide.imageAlt || ""}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      fill
                      unoptimized
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-6 sm:p-8 lg:p-10">
                    {activeHeroSlide.eyebrow && (
                      <p className="mb-2 w-fit rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur sm:text-xs">
                        {activeHeroSlide.eyebrow}
                      </p>
                    )}
                    <h2 className="line-clamp-3 max-w-sm text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                      {activeHeroSlide.title}
                    </h2>
                    {activeHeroSlide.description && (
                      <p className="mt-2 line-clamp-3 max-w-sm text-sm leading-6 text-white/85">
                        {activeHeroSlide.description}
                      </p>
                    )}
                    {activeHeroSlide.buttonLabel && (
                      <a
                        href={activeHeroSlide.buttonUrl}
                        target={
                          activeHeroSlide.buttonUrl.startsWith("http")
                            ? "_blank"
                            : undefined
                        }
                        rel={
                          activeHeroSlide.buttonUrl.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-800 hover:bg-indigo-50"
                      >
                        {activeHeroSlide.buttonLabel}
                        <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </div>
                </article>
                {heroSlides.length > 1 && (
                  <div className="absolute bottom-3 right-1 z-20 flex items-center gap-2 rounded-full border border-white/70 bg-white/95 p-1.5 shadow-lg sm:bottom-5">
                    <button
                      type="button"
                      aria-label="Previous homepage slide"
                      onClick={() =>
                        setHeroSlideIndex(
                          (index) =>
                            (index - 1 + heroSlides.length) % heroSlides.length,
                        )
                      }
                      className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
                    >
                      <span aria-hidden="true">←</span>
                    </button>
                    <span
                      className="min-w-10 text-center text-xs font-bold tabular-nums text-slate-700"
                      aria-label={`Slide ${heroSlideIndex + 1} of ${heroSlides.length}`}
                    >
                      {heroSlideIndex + 1} / {heroSlides.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next homepage slide"
                      onClick={() =>
                        setHeroSlideIndex(
                          (index) => (index + 1) % heroSlides.length,
                        )
                      }
                      className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
                    >
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="hero-right hero-default-content" aria-label="CourseHub learning dashboard preview">
                <div className="hero-glow" />

                <div className="hero-illustration">
                  <div className="hero-topbar">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                    <span className="topbar-label">COURSEHUB LEARNING</span>
                  </div>

                  <div className="hero-dashboard">
                    <div className="hero-sidebar" aria-hidden="true">
                      <div className="hero-logo">C</div>
                      <span className="active">⌂</span>
                      <span>▤</span>
                      <span>⌘</span>
                      <span>⚙</span>
                    </div>

                    <div className="hero-main">
                      <span className="hero-eyebrow">YOUR LEARNING SPACE</span>
                      <h2>Learn. Build. Grow.</h2>
                      <p>Every skill takes you one step further.</p>

                      <div className="hero-progress">
                        <div className="progress-title">
                          <span>Your progress</span>
                          <strong>75%</strong>
                        </div>
                        <div className="progress-bar">
                          <span />
                        </div>
                      </div>

                      <h3>Explore Your Skills</h3>

                      <div className="hero-course">
                        <div className="course-icon blue">&lt;/&gt;</div>
                        <div>
                          <strong>Web Development</strong>
                          <small>HTML · CSS · JavaScript</small>
                        </div>
                        <span className="course-arrow">↗</span>
                      </div>

                      <div className="hero-course">
                        <div className="course-icon purple">JS</div>
                        <div>
                          <strong>Programming</strong>
                          <small>Learn by doing</small>
                        </div>
                        <span className="course-arrow">↗</span>
                      </div>

                      <div className="hero-course">
                        <div className="course-icon teal">✦</div>
                        <div>
                          <strong>New Skills</strong>
                          <small>Discover your potential</small>
                        </div>
                        <span className="course-arrow">↗</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hero-float float-one">
                  <span className="float-icon">🚀</span>
                  <div>
                    <strong>Keep Growing!</strong>
                    <small>Your future starts here</small>
                  </div>
                </div>

                <div className="hero-float float-two">
                  <span className="float-check">✓</span>
                  <div>
                    <strong>Skill Unlocked</strong>
                    <small>Great progress!</small>
                  </div>
                </div>

                <div className="hero-code-symbol" aria-hidden="true">&lt;/&gt;</div>
                <div className="hero-star" aria-hidden="true">✦</div>
              </div>
            )}
          </div>
        </div>
      </section>
      {user && (
        <>
      <section className="container py-12 sm:py-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-700">
              Fresh from CourseHub
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              New playlists
            </h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Start learning with the latest courses added by our team.
            </p>
          </div>
          <button
            onClick={() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })}
            className="self-start rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white sm:self-auto"
          >
            Browse all courses
          </button>
        </div>
        {courses.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 3).map((course) => (
              <button
                key={course._id}
                onClick={() => openCourse(course._id)}
                className="group flex min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="relative h-28 w-28 shrink-0 bg-gradient-to-br from-cyan-500 to-indigo-700 sm:h-32 sm:w-32">
                  {course.thumbnail && (
                    <Image
                      src={course.thumbnail}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      fill
                      unoptimized
                    />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-cyan-800">
                    NEW
                  </span>
                </span>
                <span className="min-w-0 p-4 sm:p-5">
                  <span className="block truncate text-xs font-bold uppercase tracking-wide text-indigo-600">
                    {course.category || "Course"} · Playlist
                  </span>
                  <span className="mt-2 block line-clamp-2 font-black text-slate-900 group-hover:text-indigo-700">
                    {course.name}
                  </span>
                  <span className="mt-2 block line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm">
                    {course.description}
                  </span>
                  <span className="mt-3 block text-xs font-bold text-indigo-600">
                    Open playlist →
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
            New course playlists will appear here when the admin publishes them.
          </div>
        )}
      </section>
      <section className="container pt-16 pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">
              Pinned by admin
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Pinned playlists
            </h2>
            <p className="mt-1 text-slate-500">
              Admin-pinned courses appear here first.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            {courses.filter((c) => c.featured).length} pinned
          </span>
        </div>
        {courses.filter((c) => c.featured).length ? (
          <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {courses
              .filter((c) => c.featured)
              .map((c, i) => (
                <button
                  key={c._id}
                  onClick={() => openCourse(c._id)}
                  className={`group overflow-hidden rounded-2xl border border-indigo-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl ${i >= 4 && !showMorePinned ? "hidden sm:block" : ""}`}
                >
                  <div className="relative h-24 bg-gradient-to-br from-indigo-600 to-violet-700 sm:h-40">
                    {c.thumbnail && (
                      <Image
                        src={c.thumbnail}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        fill
                        unoptimized
                      />
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-indigo-700 sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
                      📌 PINNED
                    </span>
                  </div>
                  <div className="p-3 sm:p-5">
                    <h3 className="line-clamp-1 text-sm font-black sm:text-lg">{c.name}</h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:text-sm sm:leading-normal">
                      {c.description}
                    </p>
                    <div className="mt-2 text-[10px] font-bold text-indigo-600 sm:mt-4 sm:text-sm">
                      <span className="sm:hidden">Open →</span>
                      <span className="hidden sm:inline">Open course →</span>
                    </div>
                  </div>
                </button>
              ))}
          </div>
          {courses.filter((c) => c.featured).length > 4 && (
            <button
              type="button"
              onClick={() => setShowMorePinned((showing) => !showing)}
              className="mt-5 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 sm:hidden"
            >
              {showMorePinned ? "Show fewer playlists ↑" : "See more playlists ↓"}
            </button>
          )}
          </>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed p-8 text-center text-sm text-slate-500">
            No courses are pinned yet. Admin can mark a course as{" "}
            <b>Featured</b> in Course CMS.
          </div>
        )}
      </section>
      <section id="courses" className="container py-20">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">
              Explore library
            </p>
            <h2 className="mt-2 text-4xl font-black tracking-tight">
              Choose your next skill.
            </h2>
            <p className="mt-2 text-slate-500">
              Courses are loaded live from your database.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShowMoreCourses(false);
              }}
              placeholder="Search courses..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-10 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
            <span className="absolute left-4 top-3 text-slate-400">⌕</span>
            {q && (
              <div className="absolute left-0 right-0 top-14 z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {filtered.slice(0, 5).map((c) => (
                  <button
                    key={c._id}
                    onClick={() => openCourse(c._id)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <b>{c.name}</b>
                    <span className="ml-2 text-slate-400">
                      {c.category || "Course"}
                    </span>
                  </button>
                ))}
                {!filtered.length && (
                  <div className="p-3 text-sm text-slate-500">
                    No suggestion found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-7 flex gap-2 overflow-x-auto pb-2">
          {availableCategories.map((x) => (
            <button
              key={x}
              onClick={() => {
                setCat(x);
                setShowMoreCourses(false);
              }}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${cat === x ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
            >
              {x}
            </button>
          ))}
        </div>
        {loading ? (
          <CourseHubLoader label="Loading courses..." className="mt-8 min-h-72" />
        ) : filtered.length === 0 ? (
          <div className="card mt-8 p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl">
              ⌁
            </div>
            <h3 className="mt-4 text-xl font-black">No courses found</h3>
            <p className="mt-2 text-slate-500">
              Try another search or category.
            </p>
          </div>
        ) : (
          <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {filtered.map((c, i) => (
              <article
                key={c._id}
                className={`card hover-card overflow-hidden duration-300 ${i >= 4 && !showMoreCourses ? "hidden sm:block" : ""}`}
              >
                <div
                  className={`relative h-24 overflow-hidden p-3 sm:h-48 sm:p-6 ${i % 3 === 0 ? "bg-gradient-to-br from-indigo-600 to-violet-700" : i % 3 === 1 ? "bg-gradient-to-br from-cyan-500 to-blue-700" : "bg-gradient-to-br from-fuchsia-500 to-violet-700"}`}
                >
                  {c.thumbnail && (
                    <Image
                      src={c.thumbnail}
                      alt={c.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      fill
                      unoptimized
                    />
                  )}
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold text-white backdrop-blur sm:px-3 sm:text-xs">
                    {c.featured ? "PINNED" : c.category || "COURSE"}
                  </span>
                  <div className="absolute bottom-2 left-3 text-2xl font-black text-white/90 sm:bottom-5 sm:left-6 sm:text-4xl">
                    {c.name.slice(0, 1)}
                  </div>
                </div>
                <div className="p-3 sm:p-6">
                  <div className="flex items-center justify-between gap-1 text-[9px] font-semibold text-slate-500 sm:text-xs">
                    <span>{c.category || "Course"}</span>
                    {c.featured && (
                      <span className="font-bold text-indigo-700">Pinned</span>
                    )}
                  </div>
                  <h3 className="mt-1 line-clamp-1 text-sm font-black sm:mt-2 sm:text-xl">{c.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-0 text-[11px] leading-4 text-slate-500 sm:mt-2 sm:min-h-12 sm:text-sm sm:leading-6">
                    {c.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-end justify-end gap-2 sm:mt-5">
                    <button
                      onClick={() => openCourse(c._id)}
                      className="rounded-lg bg-slate-900 px-2.5 py-2 text-[10px] font-bold text-white sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      <span className="sm:hidden">View</span>
                      <span className="hidden sm:inline">View course</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filtered.length > 4 && (
            <button
              type="button"
              onClick={() => setShowMoreCourses((showing) => !showing)}
              className="mt-5 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 sm:hidden"
            >
              {showMoreCourses ? "Show fewer courses ↑" : "See more courses ↓"}
            </button>
          )}
          </>
        )}
      </section>
        </>
      )}
      <section id="why" className="bg-white py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">
              Built for momentum
            </p>
            <h2 className="mt-2 text-4xl font-black">
              Everything you need to keep learning.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <div className="card p-7">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-xl">
                ◎
              </div>
              <h3 className="mt-5 text-xl font-black">Focused learning</h3>
              <p className="mt-2 leading-7 text-slate-500">
                Clear lessons and structured progress keep you moving without
                the noise.
              </p>
            </div>
            <div className="card p-7">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-xl">
                ↗
              </div>
              <h3 className="mt-5 text-xl font-black">Real progress</h3>
              <p className="mt-2 leading-7 text-slate-500">
                Your dashboard keeps subscriptions and learning progress in one
                place.
              </p>
            </div>
            <div className="card p-7">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-xl">
                ◆
              </div>
              <h3 className="mt-5 text-xl font-black">Modern experience</h3>
              <p className="mt-2 leading-7 text-slate-500">
                Responsive layouts, polished states, and accessible interactions
                across devices.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section
        id="certificate-verification"
        className="scroll-mt-24 bg-[linear-gradient(180deg,#f6f7fc_0%,#eef0f9_100%)] py-16 sm:py-20"
      >
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-8 overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-[0_24px_70px_rgba(29,35,66,.09)] md:grid-cols-[.9fr_1.1fr]">
            <div className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-800 p-7 text-white sm:p-10">
              <div
                aria-hidden="true"
                className="absolute -bottom-20 -right-16 -z-10 h-64 w-64 rounded-full bg-cyan-300/15 blur-2xl"
              />
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-2xl text-indigo-100">
                ✓
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-indigo-100">
                Trusted credentials
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                Verify a CourseHub certificate
              </h2>
              <p className="mt-3 text-sm leading-6 text-indigo-100">
                Confirm that a certificate was issued by CourseHub and check
                its current status using its unique ID.
              </p>
            </div>
            <div className="p-6 sm:p-10">
              <p className="text-sm font-bold text-slate-700">
                Have a certificate ID?
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Enter the ID printed on the certificate to check its
                authenticity.
              </p>
              <form
                className="mt-5 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const normalizedId = certificateId.trim();
                  if (!normalizedId) {
                    router.push("/verify-certificate");
                    return;
                  }
                  router.push(
                    `/verify-certificate?id=${encodeURIComponent(normalizedId)}`,
                  );
                }}
              >
                <label className="sr-only" htmlFor="home-certificate-id">
                  Certificate ID
                </label>
                <input
                  id="home-certificate-id"
                  value={certificateId}
                  onChange={(event) => setCertificateId(event.target.value)}
                  placeholder="Enter certificate ID"
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  className="h-12 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-900/10 transition hover:bg-indigo-700"
                >
                  Verify certificate
                </button>
              </form>
              <Link
                href="/verify-certificate"
                className="mt-4 inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-900"
              >
                Open certificate verification page
                <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section id="faq" className="container scroll-mt-24 py-12 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-black sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-7 space-y-3 sm:mt-10">
            {[
              [
                "Can I learn at my own pace?",
                "Yes. Course access is designed around self-paced learning.",
              ],
              [
                "Where is my course data stored?",
                "Courses and subscriptions are loaded from your connected MongoDB backend.",
              ],
              [
                "Can the platform grow later?",
                "Yes. The current structure can be extended with admin management, analytics, SEO tools and richer lesson media.",
              ],
            ].map(([q, a]) => (
              <details key={q} className="card group p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  <span className="min-w-0">{q}</span>
                  <span className="shrink-0 text-indigo-600 group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t bg-slate-950 text-slate-300">
        <div className="container flex flex-col justify-between gap-6 py-10 md:flex-row">
          <div>
            <CourseHubLogo size="md" light />
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Learn modern skills with a premium, practical learning experience.
            </p>
          </div>
          <div className="text-sm text-slate-400">
            {user && (
              <div className="mb-3 flex flex-wrap gap-4">
                <Link href="/support" className="font-semibold text-white hover:text-indigo-300">
                  Contact support
                </Link>
                <Link href="/community/feed" className="hover:text-white">
                  Community
                </Link>
              </div>
            )}
            © {new Date().getFullYear()} CourseHub. Built for learning.
          </div>
        </div>
      </footer>
    </main>
  );
}
