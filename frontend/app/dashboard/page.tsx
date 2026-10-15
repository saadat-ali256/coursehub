/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import CourseHubLoader from "@/components/CourseHubLoader";
import CourseHubLogo from "@/components/CourseHubLogo";
import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
type Tab =
  | "overview"
  | "courses"
  | "subscriptions"
  | "progress"
  | "profile"
  | "settings";

type DashboardCourse = {
  _id: string;
  name?: string;
  thumbnail?: string;
  lessonCount?: number;
};

type DashboardProgress = {
  _id: string;
  courseId: DashboardCourse;
  lessonId: { _id?: string; title?: string; duration?: number };
  position: number;
  duration: number;
  completed: boolean;
};

type DashboardSubscription = {
  _id: string;
  status: string;
  courseId?: DashboardCourse;
  currentPeriodEnd?: string;
};

type DashboardProfile = {
  name: string;
  bio: string;
  avatarUrl: string;
  username: string;
  coverImage: string;
};

type DashboardGoal = {
  targetMinutes: number | string;
  targetLessons: number | string;
  title: string;
  minutesDone?: number;
  lessonsDone?: number;
};

type DashboardPassword = {
  currentPassword: string;
  newPassword: string;
};

type DashboardData = {
  success?: boolean;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    bio?: string;
    avatarUrl?: string;
    username?: string;
    coverImage?: string;
    communityAccess?: boolean;
  };
  goal?: DashboardGoal;
  progress?: DashboardProgress[];
  totalLessons?: number;
  subscriptions?: DashboardSubscription[];
  quizAttempts?: {
    _id: string;
    quizId?: { title?: string };
    percent?: number;
  }[];
  bookmarks?: {
    _id: string;
    lessonId?: {
      title?: string;
      courseId?: string | { _id: string };
    };
  }[];
  learningStreak?: number;
};

type DashboardCourseCard = {
  id: string;
  name: string;
  items: DashboardProgress[];
  thumb?: string;
  lessonCount: number;
};

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
  >
    {children}
  </div>
);
function DashboardAvatar({
  src,
  name,
  size,
}: {
  src?: string;
  name?: string;
  size: string;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <Image
      src={src}
      alt={`${name || "User"} profile`}
      width={56}
      height={56}
      unoptimized
      onError={() => setFailed(true)}
      className={`${size} shrink-0 rounded-full border-2 border-white object-cover shadow-sm`}
    />
  ) : (
    <div
      className={`${size} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 font-black text-white`}
      aria-label={`${name || "User"} profile`}
    >
      {String(name || "U")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </div>
  );
}
export default function Dashboard() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const [d, setD] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(true);
  const [goal, setGoal] = useState<DashboardGoal>({
    targetMinutes: 180,
    targetLessons: 5,
    title: "Weekly learning goal",
  });
  const [profile, setProfile] = useState({
    name: "",
    bio: "",
    avatarUrl: "",
    username: "",
    coverImage: "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const load = () =>
    fetch("/api/learning/dashboard")
      .then((r) => r.json())
      .then((x) => {
        setD(x);
        if (x.goal) setGoal(x.goal);
        if (x.user)
          setProfile({
            name: x.user.name || "",
            bio: x.user.bio || "",
            avatarUrl: x.user.avatarUrl || "",
            username: x.user.username || "",
            coverImage: x.user.coverImage || "",
          });
      })
      .finally(() => setBusy(false));
  useEffect(() => {
    load();
  }, []);
  async function saveGoal() {
    try {
      const r = await fetch("/api/learning/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(goal),
      });
      const result = await r.json();
      if (!r.ok || !result.success) {
        throw new Error(result.message || "Could not save goal.");
      }
      setGoal(result.goal);
      setMessage("Goal saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save goal.");
    }
  }
  async function saveProfile() {
    if (!d?.user?.communityAccess) {
      setMessage("Subscribe to edit your profile.");
      return;
    }
    const r = await fetch("/api/community/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });
    const x = await r.json();
    setMessage(
      x.success ? "Profile updated." : x.message || "Profile update failed.",
    );
    if (x.success) load();
  }
  async function uploadProfileImage(file: File, kind: "avatar" | "banner") {
    if (!d?.user?.communityAccess) {
      setMessage("Subscribe to upload profile images.");
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setMessage("Choose an image up to 10 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    try {
      const response = await fetch("/api/community/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Profile image upload failed.");
      setProfile((current) => ({
        ...current,
        [kind === "avatar" ? "avatarUrl" : "coverImage"]: result.url,
      }));
      setMessage(kind === "avatar" ? "Profile photo uploaded." : "Profile banner uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile image upload failed.");
    }
  }
  async function changePassword() {
    if (changingPassword) return;
    setChangingPassword(true);
    setMessage("");
    try {
      if (!clerkUser) throw new Error("Your Clerk session is not available. Please sign in again.");
      await clerkUser.updatePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
        signOutOfOtherSessions: true,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change password.");
      setChangingPassword(false);
      return;
    }

    setPassword({
      currentPassword: "",
      newPassword: "",
    });
    try {
      await signOut({ redirectUrl: "/login?passwordChanged=1" });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Password changed, but could not sign out this device: ${error.message}`
          : "Password changed, but could not sign out this device. Please use Log out before signing in again.",
      );
      setChangingPassword(false);
    }
  }
  async function logout() {
    setLoggingOut(true);
    try {
      await signOut({ redirectUrl: "/login" });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not log out.",
      );
      setLoggingOut(false);
    }
  }
  if (busy)
    return (
      <CourseHubLoader fullScreen label="Loading your dashboard..." />
    );
  if (!d?.success)
    return (
      <main className="min-h-screen grid place-items-center">
        <Link
          href="/login"
          className="rounded-xl bg-indigo-600 px-5 py-3 text-white"
        >
          Sign in
        </Link>
      </main>
    );
  const progress = d.progress || [];
  const completedProgress = progress.filter((x) => x.completed).length;
  const total = Number(d.totalLessons) || progress.length;
  const completed = Math.min(completedProgress, total);
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const activeSubs = (d.subscriptions || []).filter((s) =>
    ["active", "trialing", "paid", "complete"].includes(s.status),
  );
  const isPremium = activeSubs.length > 0;
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
        ? "Good afternoon"
        : "Good evening";
  const tabs: [Tab, string, string][] = [
    ["overview", "⌂", "Overview"],
    ["courses", "▣", "My Courses"],
    ["subscriptions", "◆", "Subscriptions"],
    ["progress", "◒", "Progress"],
    ["profile", "●", "Profile"],
    ["settings", "⚙", "Settings"],
  ];
  return (
    <main className="coursehub-page min-h-screen bg-[#f5f7fb] pb-12">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="site-navbar-inner mx-auto flex w-full items-center justify-between gap-4 px-3 py-3 sm:px-4 md:py-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-black">
              <CourseHubLogo size="sm" />
            </Link>
            <span
              className={`hidden rounded-full px-3 py-1 text-xs font-black sm:inline-flex ${isPremium ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
            >
              {isPremium ? "✦ PREMIUM MEMBER" : "FREE MEMBER"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/community"
              className="hidden rounded-xl border px-3 py-2 text-sm font-semibold md:block"
            >
              Community
            </Link>
            {d.user?.role === "admin" && (
              <Link
                href="/admin"
                aria-label="Admin Dashboard"
                title="Admin Dashboard"
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white sm:flex sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm sm:font-bold"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 sm:h-4 sm:w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" />
                  <circle cx="12" cy="9" r="2" />
                  <path d="M8.5 15c.8-1.2 2-1.8 3.5-1.8s2.7.6 3.5 1.8" />
                </svg>
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
            )}
            <DashboardAvatar
              src={d.user?.avatarUrl}
              name={d.user?.name}
              size="h-10 w-10 text-sm"
            />
          </div>
        </div>
      </header>
      <div className="w-full px-3 py-6 sm:px-4">
        <div className="grid gap-6 md:grid-cols-[190px_minmax(0,1fr)] lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:sticky md:top-24">
            <div className="mb-3 px-3 py-4">
              <DashboardAvatar
                src={d.user?.avatarUrl}
                name={d.user?.name}
                size="h-14 w-14 text-lg"
              />
              <div className="mt-3 font-black">{d.user?.name}</div>
              <div className="truncate text-xs text-slate-500">
                {d.user?.email}
              </div>
            </div>
            <nav className="grid grid-cols-1 gap-1">
              {tabs.map(([k, i, l]) => (
                <div key={k}>
                  <button
                    onClick={() => setTab(k)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold ${tab === k ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span>{i}</span>
                    {l}
                  </button>
                  {k === "progress" && (
                    <Link
                      href="/dashboard/exams"
                      className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      <span aria-hidden="true">✦</span>
                      Final Exams
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <Link
              href="/premium"
              className="mt-3 block rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-3 text-center text-sm font-black text-white"
            >
              {isPremium ? "Manage Premium" : "Upgrade to Premium"}
            </Link>
          </aside>
          <section className="min-w-0">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="text-sm font-bold text-indigo-600">
                  Student Learning Center
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-tight md:text-5xl">
                  {greeting},{String(d.user?.name || "Student").split(" ")[0]}{" "}
                  👋
                </h1>
                <p className="mt-2 text-slate-500">
                  Everything you need to learn, track progress, manage your plan
                  and build your profile.
                </p>
              </div>
              {message && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}
            </div>
            {tab === "overview" && (
              <Overview
                d={d}
                pct={pct}
                total={total}
                completed={completed}
                isPremium={isPremium}
                goal={goal}
                setGoal={setGoal}
                saveGoal={saveGoal}
              />
            )}
            {tab === "courses" && <MyCourses d={d} />}
            {tab === "subscriptions" && (
              <Subscriptions d={d} isPremium={isPremium} />
            )}
            {tab === "progress" && (
              <Progress d={d} pct={pct} total={total} completed={completed} />
            )}
            {tab === "profile" && (
              <Profile
                profile={profile}
                setProfile={setProfile}
                saveProfile={saveProfile}
                uploadProfileImage={uploadProfileImage}
                communityAccess={!!d.user?.communityAccess}
                logout={logout}
                loggingOut={loggingOut}
              />
            )}
            {tab === "settings" && (
              <Settings
                password={password}
                setPassword={setPassword}
                changePassword={changePassword}
                changingPassword={changingPassword}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
function Overview({
  d,
  pct,
  total,
  completed,
  isPremium,
  goal,
  setGoal,
  saveGoal,
}: {
  d: DashboardData;
  pct: number;
  total: number;
  completed: number;
  isPremium: boolean;
  goal: DashboardGoal;
  setGoal: Dispatch<SetStateAction<DashboardGoal>>;
  saveGoal: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <Card>
          <div className="text-sm text-slate-500">Overall progress</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black">{pct}%</span>
            <span className="text-sm font-semibold text-slate-500">
              complete
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {completed} of {total} lessons completed
          </div>
          <div
            role="progressbar"
            aria-label="Overall learning progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="mt-3 h-2 rounded-full bg-slate-100"
          >
            <div
              className="h-2 rounded-full bg-indigo-600"
              style={{
                width: `${pct}%`,
              }}
            />
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Access</div>
          <div className="mt-2 text-2xl font-black">
            {isPremium ? "Premium" : "Free"}
          </div>
          <Link
            href="/premium"
            className="mt-2 block text-xs font-bold text-indigo-600"
          >
            View plans →
          </Link>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-black">Continue learning</h2>
              <p className="text-sm text-slate-500">
                Pick up exactly where you stopped.
              </p>
            </div>
            <span className="inline-flex w-fit max-w-full shrink-0 whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {completed} completed
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {(d.progress || []).slice(0, 7).map((p) => (
              <Link
                key={p._id}
                href={`/courses/${p.courseId?._id || p.courseId}`}
                className="block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-indigo-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">
                      {p.lessonId?.title || "Lesson"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {p.courseId?.name || "Course"}
                    </div>
                  </div>
                  <span className="text-sm font-black text-indigo-600">
                    {p.completed
                      ? "Done"
                      : `${Math.min(100, Math.round((p.position / (p.duration || 1)) * 100))}%`}
                  </span>
                </div>
              </Link>
            ))}
            {!d.progress?.length && (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                No learning activity yet.{" "}
                <Link className="font-bold text-indigo-600" href="/#courses">
                  Explore courses
                </Link>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black">Weekly goal</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">
              Minutes
              <input
                type="number"
                min="1"
                max="10080"
                value={goal.targetMinutes || ""}
                onChange={(e) =>
                  setGoal({
                    ...goal,
                    targetMinutes: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold">
              Lessons
              <input
                type="number"
                min="1"
                max="500"
                value={goal.targetLessons || ""}
                onChange={(e) =>
                  setGoal({
                    ...goal,
                    targetLessons: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
          </div>
          <button
            onClick={saveGoal}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white"
          >
            Save goal
          </button>
          <div className="mt-4 space-y-3">
            <GoalProgress
              label="Minutes this week"
              value={Number(goal.minutesDone || 0)}
              target={Number(goal.targetMinutes || 180)}
              suffix="min"
            />
            <GoalProgress
              label="Lessons this week"
              value={Number(goal.lessonsDone || 0)}
              target={Number(goal.targetLessons || 5)}
            />
          </div>
          <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
            <div className="text-xs uppercase tracking-widest text-indigo-300">
              Learning streak
            </div>
            <div className="mt-2 text-3xl font-black">
              🔥 {Number(d.learningStreak || 0)} days
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Consecutive days with a completed lesson.
            </div>
          </div>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <h2 className="font-black">Quiz performance</h2>
          <div className="mt-4 space-y-2">
            {(d.quizAttempts || []).slice(0, 5).map((x) => (
              <div
                key={x._id}
                className="flex justify-between rounded-xl bg-slate-50 p-3"
              >
                <span>{x.quizId?.title || "Quiz"}</span>
                <b>{x.percent}%</b>
              </div>
            ))}
            {!d.quizAttempts?.length && (
              <p className="text-sm text-slate-500">No quiz attempts yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="font-black">Saved lessons</h2>
          <div className="mt-4 space-y-2">
            {(d.bookmarks || []).slice(0, 5).map((x) => (
              <div
                key={x._id}
                className="rounded-xl bg-slate-50 p-3 font-semibold"
              >
                <Link
                  href={`/courses/${x.lessonId?.courseId}`}
                  className="block hover:text-indigo-700"
                >
                  🔖 {x.lessonId?.title || "Lesson"}
                </Link>
              </div>
            ))}
            {!d.bookmarks?.length && (
              <p className="text-sm text-slate-500">No bookmarks yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
function GoalProgress({
  label,
  value,
  target,
  suffix = "",
}: {
  label: string;
  value: number;
  target: number;
  suffix?: string;
}) {
  const progress = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="text-slate-500">
          {Math.floor(value)} / {target} {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
function MyCourses({ d }: { d: DashboardData }) {
  const courses = useMemo(() => {
    const m = new Map<string, DashboardCourseCard>();
    (d.subscriptions || [])
      .filter((s) =>
        ["active", "trialing", "paid", "complete"].includes(s.status),
      )
      .forEach((s) => {
        const course = s.courseId;
        const id = course?._id || course;
        if (id) {
          m.set(String(id), {
            id: String(id),
            name: course?.name || "Course",
            items: [],
            thumb: course?.thumbnail,
            lessonCount: Number(course?.lessonCount || 0),
          });
        }
      });
    (d.progress || []).forEach((p) => {
      const id = p.courseId._id;
      if (!m.has(id)) {
      m.set(id, {
          id,
        name: p.courseId.name || "Course",
          items: [],
        thumb: p.courseId.thumbnail,
          lessonCount: 0,
        });
      }
      m.get(id)?.items.push(p);
    });
    return [...m.values()];
  }, [d]);
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-2xl font-black">My Courses</h2>
        <p className="mt-1 text-slate-500">
          Your active learning library and resume points.
        </p>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        {courses.map((c) => {
          const done = c.items.filter((x) => x.completed).length;
          const totalLessons = c.lessonCount || c.items.length;
          const percent = totalLessons
            ? Math.round((done / totalLessons) * 100)
            : 0;
          return (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700">
                {c.thumb && (
                  <Image
                    src={c.thumb}
                    width={640}
                    height={256}
                    unoptimized
                    className="h-full w-full object-cover"
                    alt=""
                  />
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-black">{c.name}</h3>
                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-indigo-600"
                    style={{
                      width: `${percent}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
                  <span>
                    {done}/{totalLessons} lessons completed
                  </span>
                  <span>{percent}%</span>
                </div>
              </div>
            </Link>
          );
        })}
        {!courses.length && (
          <Card className="md:col-span-2 text-center">
            <p className="text-slate-500">No course progress yet.</p>
            <Link
              href="/#courses"
              className="mt-3 inline-block font-bold text-indigo-600"
            >
              Browse courses →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
function Subscriptions({ d, isPremium }: { d: DashboardData; isPremium: boolean }) {
  return (
    <div className="space-y-5">
      <Card
        className={
          isPremium
            ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
            : ""
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-indigo-600">
              Membership status
            </div>
            <h2 className="mt-1 text-3xl font-black">
              {isPremium ? "Premium active ✦" : "Free plan"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isPremium
                ? "Your active subscription access is shown below."
                : "Unlock premium courses, learning resources and community access."}
            </p>
          </div>
          <Link
            href="/premium"
            className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
          >
            {isPremium ? "View Premium" : "See Premium Plans"}
          </Link>
        </div>
      </Card>
      <div className="grid gap-4">
        {(d.subscriptions || []).map((s) => (
          <Card key={s._id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-black">
                  {s.courseId?.name || "Subscription"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Status: {s.status}
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                {s.currentPeriodEnd
                  ? `Renews/ends ${new Date(s.currentPeriodEnd).toLocaleDateString()}`
                  : ""}
              </div>
            </div>
          </Card>
        ))}
        {!d.subscriptions?.length && (
          <Card className="text-center">
            <p className="text-slate-500">No subscriptions yet.</p>
            <Link
              href="/premium"
              className="mt-3 inline-block font-bold text-indigo-600"
            >
              Choose a premium plan →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
function Progress({
  d,
  pct,
  total,
  completed,
}: {
  d: DashboardData;
  pct: number;
  total: number;
  completed: number;
}) {
  const progress = d.progress || [];
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-slate-500">Overall completion</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-black">{pct}%</span>
              <span className="text-sm font-semibold text-slate-500">
                complete
              </span>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            {completed} of {total} lessons completed
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Overall learning completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-5 h-3 rounded-full bg-slate-100"
        >
          <div
            className="h-3 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600"
            style={{
              width: `${pct}%`,
            }}
          />
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Detailed lesson progress</h2>
        <div className="mt-4 space-y-3">
          {progress.map((p) => (
            <div key={p._id} className="rounded-2xl border p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <b>{p.lessonId?.title || "Lesson"}</b>
                  <div className="text-sm text-slate-500">
                    {p.courseId?.name || "Course"}
                  </div>
                </div>
                <b className="text-indigo-600">
                  {p.completed
                    ? "100%"
                    : `${Math.min(100, Math.round((p.position / (p.duration || 1)) * 100))}%`}
                </b>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
function Profile({
  profile,
  setProfile,
  saveProfile,
  uploadProfileImage,
  communityAccess,
  logout,
  loggingOut,
}: {
  profile: DashboardProfile;
  setProfile: Dispatch<SetStateAction<DashboardProfile>>;
  saveProfile: () => void;
  uploadProfileImage: (file: File, kind: "avatar" | "banner") => Promise<void>;
  communityAccess: boolean;
  logout: () => void;
  loggingOut: boolean;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-2xl font-black">Profile</h2>
        <p className="mt-1 text-slate-500">
          Manage the profile people see in the CourseHub community.
        </p>
        {!communityAccess && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              Subscribe to update your name, username, bio, profile photo, and banner.
            </p>
            <Link
              href="/subscriptions"
              className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-bold text-white"
            >
              View subscriptions
            </Link>
          </div>
        )}
        <div className="mt-6 overflow-hidden rounded-2xl border bg-slate-50">
          <div
            className="relative h-32 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-cover bg-center sm:h-40"
            style={{
              backgroundImage: profile.coverImage
                ? `url("${profile.coverImage}")`
                : undefined,
            }}
          >
            <div className="absolute -bottom-9 left-4 h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-indigo-100 shadow sm:left-6">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt="Profile photo preview"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-black text-indigo-700">
                  {profile.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 px-4 pb-4 pt-12 sm:px-6">
            <label className={`cursor-pointer rounded-xl border bg-white px-4 py-2.5 text-sm font-bold ${!communityAccess ? "pointer-events-none opacity-50" : "hover:border-indigo-300"}`}>
              Upload profile photo
              <input
                type="file"
                accept="image/*"
                disabled={!communityAccess}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadProfileImage(file, "avatar");
                  event.target.value = "";
                }}
              />
            </label>
            <label className={`cursor-pointer rounded-xl border bg-white px-4 py-2.5 text-sm font-bold ${!communityAccess ? "pointer-events-none opacity-50" : "hover:border-indigo-300"}`}>
              Upload banner
              <input
                type="file"
                accept="image/*"
                disabled={!communityAccess}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadProfileImage(file, "banner");
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Name
            <input
              value={profile.name}
              disabled={!communityAccess}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  name: e.target.value,
                })
              }
              className="mt-1 w-full rounded-xl border px-4 py-3 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </label>
          <label className="text-sm font-bold">
            Username
            <input
              value={profile.username}
              disabled={!communityAccess}
              minLength={3}
              maxLength={24}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""),
                })
              }
              placeholder="Unique username"
              className="mt-1 w-full rounded-xl border px-4 py-3 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Use 3–24 letters, numbers, dots, or underscores.
            </span>
          </label>
          <label className="text-sm font-bold md:col-span-2">
            Bio
            <textarea
              value={profile.bio}
              disabled={!communityAccess}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  bio: e.target.value,
                })
              }
              rows={4}
              maxLength={500}
              className="mt-1 w-full rounded-xl border px-4 py-3 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </label>
        </div>
        <button
          onClick={saveProfile}
          disabled={!communityAccess}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save profile
        </button>
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Account</h3>
            <p className="text-sm text-slate-500">
              Sign out of your CourseHub account on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-xl border border-indigo-200 px-5 py-3 text-sm font-bold text-indigo-800 hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </Card>
    </div>
  );
}
function Settings({
  password,
  setPassword,
  changePassword,
  changingPassword,
}: {
  password: DashboardPassword;
  setPassword: Dispatch<SetStateAction<DashboardPassword>>;
  changePassword: () => void;
  changingPassword: boolean;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-2xl font-black">Settings & Security</h2>
        <p className="mt-1 text-slate-500">Manage account security.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            type="password"
            placeholder="Current password"
            value={password.currentPassword}
            onChange={(e) =>
              setPassword({
                ...password,
                currentPassword: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
          />
          <input
            type="password"
            placeholder="New password (8+ chars)"
            value={password.newPassword}
            onChange={(e) =>
              setPassword({
                ...password,
                newPassword: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
          />
        </div>
        <button
          type="button"
          onClick={changePassword}
          disabled={changingPassword}
          className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {changingPassword ? "Changing password and signing out…" : "Change password"}
        </button>
      </Card>
      <Card>
        <h3 className="font-black">Quick links</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/community/feed" className="rounded-xl border p-4 font-bold">
            Community →
          </Link>
          <Link href="/support" className="rounded-xl border p-4 font-bold">
            Contact support →
          </Link>
          <Link href="/blog" className="rounded-xl border p-4 font-bold">
            Study Blog →
          </Link>
          <Link href="/premium" className="rounded-xl border p-4 font-bold">
            Premium →
          </Link>
        </div>
      </Card>
    </div>
  );
}
