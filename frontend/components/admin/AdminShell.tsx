/* AUTO-FORMATTED FOR READABILITY */
/* Reusable component: contains UI and behavior shared by pages. */
// CLIENT COMPONENT: This admin UI runs in the browser because it uses React state, effects, and browser navigation.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useClerk } from "@clerk/nextjs";
import CourseHubLoader, { CSpinner } from "@/components/CourseHubLoader";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProfile, { type AdminProfileUser } from "@/components/admin/AdminProfile";
import CategoryPicker from "@/components/admin/CategoryPicker";
import ExamsAdmin from "@/components/admin/ExamsAdmin";
import CourseHubLogo from "@/components/CourseHubLogo";
// SECTION TYPE: Defines every section that can be opened inside the admin panel.
type Section =
  | "dashboard"
  | "courses"
  | "lessons"
  | "exams"
  | "users"
  | "subscriptions"
  | "payments"
  | "analytics"
  | "seo"
  | "blog"
  | "community"
  | "meeting"
  | "premium";
type AdminPermission = "manage_community" | "moderate_feed" | "manage_users";
type AdminUser = AdminProfileUser & {
  _id: string;
  role: "admin" | "subadmin" | "user";
  adminPermissions?: AdminPermission[];
  canMessageAdmin?: boolean;
  subscriptionCount?: number;
  createdAt?: string;
};
type AdminCourse = {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  interval?: string;
  lessonCount?: number;
  category?: string;
  level?: string;
  instructor?: string;
  published?: boolean;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  thumbnail?: string;
};
type AdminLesson = {
  _id: string;
  courseId?: { _id?: string; name?: string } | string;
  title: string;
  order: number;
  type?: string;
  duration?: number;
  videoUrl?: string;
  published?: boolean;
  preview?: boolean;
  visibility?: string;
};
type AdminSectionData = {
  success?: boolean;
  message?: string;
  currentUserRole?: AdminUser["role"];
  monthlyRevenueTarget?: number;
  stats?: Record<string, number | undefined>;
  topCourses?: { _id?: string; name?: string; views?: number }[];
  monthly?: { _id?: { label?: string; m?: number; y?: number }; revenue?: number; transactions?: number }[];
  trends?: { revenue?: number };
  courses?: AdminCourse[];
  lessons?: AdminLesson[];
  users?: AdminUser[];
  subscriptions?: AdminSubscription[];
  score?: number;
  issues?: AdminSeoIssue[];
  meeting?: AdminMeeting | null;
};
type AdminSubscription = {
  _id: string;
  userId?: { name?: string; email?: string };
  courseId?: { name?: string };
  grantedBy?: { name?: string };
  status?: string;
  provider?: string;
  createdAt?: string;
  currentPeriodEnd?: string;
};
type AdminSeoIssue = {
  issue?: string;
  page?: string;
  severity?: string;
};
type AdminMeeting = {
  title: string;
  meetingUrl: string;
  provider?: string;
  startsAt?: string;
  endsAt?: string;
};
type PremiumPlan = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  interval: "month" | "year";
  description?: string;
  features: string[];
  stripePriceId?: string;
  paypalPlanId?: string;
};
type PremiumPlanForm = Omit<PremiumPlan, "_id" | "price" | "features"> & {
  price: string;
  features: string;
};
type AdminPayment = {
  _id: string;
  userId?: { name?: string; email?: string };
  planId?: { name?: string };
  provider?: string;
  amount?: number;
  status?: string;
  receiptUrl?: string;
};
type CommunityGroup = {
  _id: string;
  name: string;
  description?: string;
  audience: string;
  avatarUrl?: string;
  memberIds?: (string | { _id?: string })[];
  memberAccessRestricted?: boolean;
};
type CommunityMember = Pick<AdminUser, "_id" | "name" | "email"> & {
  username?: string;
};
type CourseForm = Omit<AdminCourse, "_id" | "price"> & { price: string };
type LessonForm = Omit<AdminLesson, "_id" | "courseId" | "order"> & {
  courseId: string;
  order: number;
  description: string;
  content: string;
  category: string;
  live: boolean;
  meetingUrl: string;
  thumbnail?: string;
};
// ADMIN NAVIGATION: Sidebar configuration containing section key, icon, and label.
const nav: [Section, string, string][] = [
  ["dashboard", "\u2302", "Dashboard"],
  ["courses", "\u25a6", "Course CMS"],
  ["lessons", "\u2637", "Lessons Manager"],
  ["exams", "\u2606", "Exams & Certificates"],
  ["users", "\u25c9", "Users"],
  ["subscriptions", "\u25c8", "Subscriptions"],
  ["payments", "$", "Payments"],
  ["analytics", "\u25d2", "Analytics"],
  ["seo", "\u2315", "SEO Dashboard"],
  ["blog", "\u270e", "Study Blog"],
  ["community", "\u25ce", "Community"],
  ["meeting", "\u25cf", "Live Meeting"],
  ["premium", "\u25c6", "Premium Plans"],
];
// LINK HELPER: Builds the URL for the selected admin section.
const links = (s: Section) => (s === "dashboard" ? "/admin" : `/admin/${s}`);
// CARD HELPER: Reusable card container used throughout the admin panel.
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}
// BADGE HELPER: Reusable status badge for statuses such as Published, Draft, Active, and Error.
function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "red" ? "bg-red-50 text-red-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}
    >
      {children}
    </span>
  );
}
// ADMIN SHELL: Main admin layout. Handles authentication, sidebar, header, mobile navigation, and section content.
export default function AdminShell({ section }: { section: Section }) {
  const { signOut } = useClerk();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState("");
  const quickActionsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeQuickActions(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !quickActionsRef.current?.contains(event.target)
      ) {
        quickActionsRef.current?.removeAttribute("open");
      }
    }
    function closeQuickActionsOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        quickActionsRef.current?.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeQuickActions);
    document.addEventListener("keydown", closeQuickActionsOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeQuickActions);
      document.removeEventListener("keydown", closeQuickActionsOnEscape);
    };
  }, []);

  async function logout() {
    setLogoutError("");
    try {
      await signOut({ redirectUrl: "/login" });
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Could not log out.",
      );
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setMe(data.user as AdminUser | null))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <CourseHubLoader fullScreen label="Loading admin workspace..." />
    );
  }

  const hasAdminAreaAccess =
    me?.role === "admin" ||
    (me?.role === "subadmin" &&
      (me.adminPermissions || []).some((permission: string) =>
        ["manage_community", "moderate_feed", "manage_users"].includes(permission),
      ));
  if (!hasAdminAreaAccess) {
    return (
      <div className="grid min-h-screen place-items-center p-5">
        <Card className="w-full max-w-md">
          <h1 className="text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-slate-500">
            Sign in with an administrator account.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-white"
          >
            Go to login
          </Link>
        </Card>
      </div>
    );
  }

  const visibleNav =
    me?.role === "admin"
      ? nav
      : nav.filter(([key]) => {
          if (key === "dashboard") return true;
          if (key === "users") return me?.adminPermissions?.includes("manage_users");
          if (key === "community") return me?.adminPermissions?.includes("manage_community");
          return false;
        });
  return (
    <div className="admin-workspace min-h-screen bg-[#f5f7fb]">
      <aside className="admin-sidebar fixed inset-y-0 left-0 hidden w-64 flex-col overflow-hidden border-r border-slate-200 bg-white p-5 lg:flex">
        <Link href="/" className="mb-8 shrink-0 px-3">
          <CourseHubLogo size="sm" />
        </Link>
        <div className="shrink-0 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Admin workspace
        </div>
        <nav
          aria-label="Admin navigation"
          className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain"
        >
          {visibleNav.map(([key, icon, label]) => (
            <Link
              key={key}
              href={links(key)}
              aria-current={section === key ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${section === key ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span aria-hidden="true" className="w-5 text-center">
                {icon}
              </span>
              {label}
            </Link>
          ))}
          {me?.role === "admin" || me?.adminPermissions?.includes("moderate_feed") ? (
            <Link
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              href="/community/feed"
            >
              <span aria-hidden="true" className="w-5 text-center">◉</span>
              Moderate feed
            </Link>
          ) : null}
        </nav>
        <div className="mt-auto min-w-0 shrink-0 rounded-2xl bg-slate-50 p-4">
          <div className="truncate text-sm font-bold">{me.name}</div>
          <div className="break-anywhere text-xs text-slate-500">
            {me.email}
          </div>
          <Link
            href="/"
            className="mt-3 block text-sm font-semibold text-indigo-600"
          >
            ← Back to website
          </Link>
        </div>
      </aside>

      <main className="min-w-0 lg:ml-64">
        <header className="admin-header sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/"
                className="block w-fit lg:hidden"
              >
                <CourseHubLogo size="sm" />
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
              >
                View user dashboard
              </Link>
              <details ref={quickActionsRef} className="admin-actions relative">
                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700">
                  <span className="hidden sm:inline">Quick actions</span>
                  <span className="sm:hidden">Actions</span>
                  <span aria-hidden="true" className="text-xs">
                    ▾
                  </span>
                </summary>
                <div className="absolute right-0 top-full z-30 mt-2 grid w-60 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {(me?.role === "admin" || me?.adminPermissions?.includes("moderate_feed")) && (
                    <Link
                      className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                      href="/community/feed"
                    >
                      Moderate community feed
                    </Link>
                  )}
                  <Link
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                    href="/admin/advanced"
                  >
                    Advanced analytics
                  </Link>
                  {me?.role === "admin" && (
                    <Link
                      className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                      href="/admin/hero-slides"
                    >
                      Homepage hero slides
                    </Link>
                  )}
                  <Link
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                    href="/admin/coupons"
                  >
                    Coupons
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <a
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                    href="/api/admin/export?type=users"
                  >
                    Export users
                  </a>
                  <a
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                    href="/api/admin/export?type=subscriptions"
                  >
                    Export subscriptions
                  </a>
                  <a
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                    href="/api/admin/export?type=payments"
                  >
                    Export payments
                  </a>
                  <Link
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50"
                    href="/"
                  >
                    View website
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Log out
                  </button>
                  {logoutError && (
                    <p role="alert" className="px-3 py-2 text-xs text-rose-700">
                      {logoutError}
                    </p>
                  )}
                </div>
              </details>
              <AdminProfile
                user={me}
                onUpdated={(updated) => setMe((current) => current ? { ...current, ...updated } : current)}
              />
            </div>
          </div>
        </header>

        <div className="sticky top-[65px] z-10 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <label htmlFor="admin-section" className="sr-only">
            Admin section
          </label>
          <select
            id="admin-section"
            value={section}
            onChange={(event) => {
              window.location.href = links(event.target.value as Section);
            }}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {visibleNav.map(([key, , label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-content mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {visibleNav.some(([key]) => key === section) ? (
            <SectionView section={section} />
          ) : (
            <Card>
              <h2 className="font-bold">Permission required</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your sub-admin account does not have access to this section.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
// SECTION VIEW: Fetches data for the selected section and chooses the correct admin component.
function SectionView({ section }: { section: Section }) {
  const [data, setData] = useState<AdminSectionData | null>(null);
  const [busy, setBusy] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  useEffect(() => {
    if (
      ["payments", "blog", "community", "meeting", "premium", "exams"].includes(section)
    )
      return;
    const url =
      section === "dashboard" || section === "analytics"
        ? `/api/admin/analytics?days=${days}`
        : `/api/admin/${section}`;
    fetch(url)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Could not load admin data.");
        }
        setData(result as AdminSectionData);
      })
      .catch((cause: unknown) => {
        setData({
          success: false,
          message: cause instanceof Error ? cause.message : "Could not load admin data.",
        });
      })
      .finally(() => setBusy(false));
  }, [section, refresh, days]);
  if (section === "payments") return <Payments />;
  if (section === "blog") return <BlogAdmin />;
  if (section === "community") return <CommunityAdmin />;
  if (section === "meeting") return <MeetingAdmin />;
  if (section === "premium") return <PremiumAdmin />;
  if (section === "exams") return <ExamsAdmin />;
  if (busy)
    return (
      <CourseHubLoader label="Loading admin dashboard..." className="md:col-span-3" />
    );
  if (!data) {
    return (
      <Card>
        <h2 className="font-bold">Could not load data</h2>
        <p className="mt-1 text-slate-500">No admin data was returned.</p>
      </Card>
    );
  }
  if (data?.success === false)
    return (
      <Card>
        <h2 className="font-bold">Could not load data</h2>
        <p className="mt-1 text-slate-500">{data.message}</p>
      </Card>
    );
  const refreshBtn = (
    <button
      onClick={() => {
        setBusy(true);
        setRefresh((x) => x + 1);
      }}
      className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
    >
      Refresh
    </button>
  );
  // DASHBOARD ROUTE: The actual Dashboard UI is the Analytics component.
  if (section === "dashboard" || section === "analytics")
    return (
      <AdminDashboard
        data={data}
        detailed={section === "analytics"}
        days={days}
        onDaysChange={(value) => {
          setBusy(true);
          setDays(value);
        }}
        onRefresh={() => setRefresh((x) => x + 1)}
      />
    );
  // COURSES ROUTE: Renders the Course CMS UI.
  if (section === "courses")
    return <Courses data={data} refresh={() => setRefresh((x) => x + 1)} />;
  // LESSONS ROUTE: Renders the Lessons Manager UI.
  if (section === "lessons")
    return <Lessons data={data} refresh={() => setRefresh((x) => x + 1)} />;
  // USERS ROUTE: Renders the Users UI.
  if (section === "users")
    return <Users key={refresh} data={data} query={query} setQuery={setQuery} />;
  // SUBSCRIPTIONS ROUTE: Renders the Subscriptions UI.
  if (section === "subscriptions")
    return (
      <Subscriptions
        data={data}
        query={query}
        setQuery={setQuery}
        refresh={() => setRefresh((x) => x + 1)}
      />
    );
  // SEO ROUTE: Renders the SEO Dashboard UI.
  return <SEO data={data} refresh={refreshBtn} />;
}
function Courses({ data, refresh }: { data: AdminSectionData; refresh: () => void }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CourseForm>({
    name: "",
    description: "",
    price: "",
    interval: "month",
    category: "",
    level: "All levels",
    instructor: "CourseHub Instructor",
    published: false,
    featured: false,
    seoTitle: "",
    seoDescription: "",
    thumbnail: "",
  });
  const [saving, setSaving] = useState(false);
  const [courseFormError, setCourseFormError] = useState("");
  const courses = data?.courses || [];
  // OPEN COURSE FORM: Opens a blank create form or loads an existing course for editing.
  function open(c: AdminCourse | null) {
    setCourseFormError("");
    setEditing(c ? c._id : "new");
    setForm(
      c
        ? {
          ...form,
          ...c,
          price: String(c.price),
        }
        : {
          ...form,
          name: "",
          description: "",
          price: "",
          category: "",
          thumbnail: "",
        },
    );
    // SAVE COURSE: POST creates a course; PATCH updates an existing course.
  }
  async function save() {
    const missing = [
      !String(form.name || "").trim() && "course name",
      !String(form.description || "").trim() && "description",
      String(form.price ?? "").trim() === "" && "price",
      !String(form.category || "").trim() && "category",
    ].filter(Boolean);
    const price = Number(form.price);
    if (missing.length || !Number.isFinite(price) || price < 0) {
      setCourseFormError(
        missing.length
          ? `Please provide: ${missing.join(", ")}.`
          : "Enter a valid price of 0 or more.",
      );
      return;
    }
    setCourseFormError("");
    setSaving(true);
    const url =
      editing === "new"
        ? "/api/admin/courses"
        : `/api/admin/courses/${editing}`;
    const r = await fetch(url, {
      method: editing === "new" ? "POST" : "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
      }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) {
      const notices = [d.notificationWarning].filter(Boolean);
      if (notices.length) window.alert(notices.join("\n"));
      setEditing(null);
      refresh();
    } else setCourseFormError(d.message || "Course could not be saved.");
    // DELETE COURSE: Deletes a course and then refreshes the list.
  }
  async function remove(id: string) {
    if (!confirm("Delete this course and its lessons?")) return;
    await fetch(`/api/admin/courses/${id}`, {
      method: "DELETE",
    });
    refresh();
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Course catalog</h2>
          <p className="text-sm text-slate-500">
            Create, edit, publish, pin and optimize every course.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export?type=users"
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
          >
            Users Excel
          </a>
          <a
            href="/api/admin/export?type=subscriptions"
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold"
          >
            Subscriptions Excel
          </a>
          <button
            onClick={() => open(null)}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-200"
          >
            + Create course
          </button>
        </div>
      </div>
      <Card>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-3">Course</th>
                <th>Status</th>
                <th>Price</th>
                <th>Lessons</th>
                <th>Category</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id} className="border-b last:border-0">
                  <td className="py-4">
                    <div className="font-bold">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      /{c.slug || "no-slug"}
                    </div>
                  </td>
                  <td>
                    <Badge tone={c.published ? "green" : "amber"}>
                      {c.published ? "PUBLISHED" : "DRAFT"}
                    </Badge>
                  </td>
                  <td className="font-semibold">
                    ${c.price}/{c.interval}
                  </td>
                  <td>{c.lessonCount}</td>
                  <td>{c.category}</td>
                  <td className="text-right">
                    <button
                      onClick={() => open(c)}
                      className="mr-2 rounded-lg border px-3 py-1.5 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c._id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {courses.map((course) => (
            <article
              key={course._id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-bold text-slate-900">
                    {course.name}
                  </h3>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    /{course.slug || "no-slug"}
                  </p>
                </div>
                <Badge tone={course.published ? "green" : "amber"}>
                  {course.published ? "PUBLISHED" : "DRAFT"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Price
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">
                    ${course.price}/{course.interval}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Lessons
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {course.lessonCount}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Category
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">
                    {course.category || "—"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => open(course)}
                  className="flex-1 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(course._id)}
                  className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        {courses.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            No courses yet. Create your first course.
          </div>
        )}
      </Card>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="relative w-full max-w-3xl">
            <div className="max-h-[92vh] w-full overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {editing === "new" ? "Create course" : "Edit course"}
                </h2>
                <p className="text-sm text-slate-500">
                  CMS content, pricing and SEO in one place.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {([
                ["name", "Course name"],
                ["price", "Price"],
                ["level", "Level"],
                ["instructor", "Instructor"],
                ["seoTitle", "SEO title"],
                ["seoDescription", "SEO description"],
              ] as const).map(([k, l]) => (
                <label
                  key={k}
                  className={k === "seoDescription" ? "md:col-span-2" : ""}
                >
                  <span className="mb-1 block text-sm font-semibold">{l}</span>
                  {k === "seoDescription" ? (
                    <textarea
                      rows={3}
                      value={form[k] || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [k]: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border px-4 py-3"
                    />
                  ) : (
                    <input
                      type={k === "price" ? "number" : "text"}
                      min={k === "price" ? "0" : undefined}
                      step={k === "price" ? "0.01" : undefined}
                      value={form[k] || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [k]: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border px-4 py-3"
                    />
                  )}
                </label>
              ))}
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-semibold">
                  Course description
                </span>
                <textarea
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  required
                  placeholder="Describe what students will learn in this course."
                  className="w-full rounded-xl border px-4 py-3"
                />
              </label>
              <CategoryPicker
                value={form.category || ""}
                onChange={(category) => setForm({ ...form, category })}
              />
              <div className="md:col-span-2 rounded-2xl border bg-slate-50 p-4">
                <div className="font-bold">Course thumbnail upload</div>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.append("file", f);
                    const r = await fetch("/api/uploads", {
                      method: "POST",
                      body: fd,
                    });
                    const d = await r.json();
                    if (r.ok)
                      setForm({
                        ...form,
                        thumbnail: d.url,
                      });
                    else alert(d.message || "Upload failed");
                  }}
                />
                <div className="mt-2 text-xs text-slate-500">
                  Current: {form.thumbnail || "none"}
                </div>
              </div>
              <label>
                <span className="mb-1 block text-sm font-semibold">
                  Billing
                </span>
                <select
                  value={form.interval}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interval: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                  <option value="one-time">One-time</option>
                </select>
              </label>
            </div>
            {courseFormError && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              >
                {courseFormError}
              </p>
            )}
            <div className="mt-5 flex gap-5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.published}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      published: e.target.checked,
                    })
                  }
                />{" "}
                Published
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.featured}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      featured: e.target.checked,
                    })
                  }
                />{" "}
                Pin playlist on homepage
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="rounded-xl border px-5 py-3"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={save}
                className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
              >
                {saving ? "Savingâ€¦" : "Save course"}
              </button>
            </div>
          </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Close course form"
              title="Close"
              className="absolute -right-3 -top-3 z-10 grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-4xl font-light leading-none text-slate-600 shadow-lg transition duration-200 hover:rotate-45 hover:border-red-600 hover:bg-red-600 hover:text-white active:scale-95 motion-reduce:transition-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// LESSONS MANAGER UI: Creates, lists, uploads, publishes, and deletes lessons.
function Lessons({ data, refresh }: { data: AdminSectionData; refresh: () => void }) {
  const [form, setForm] = useState<LessonForm>({
    courseId: "",
    title: "",
    description: "",
    content: "",
    order: 1,
    type: "video",
    duration: 10,
    category: "",
    videoUrl: "",
    thumbnail: "",
    live: false,
    meetingUrl: "",
    published: true,
    preview: false,
    visibility: "premium",
  });
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [courseLoadError, setCourseLoadError] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState("");
  const [uploadedVideoName, setUploadedVideoName] = useState("");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/admin/courses")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success)
          throw new Error(data.message || "Could not load courses.");
        if (!cancelled) setCourses(data.courses || []);
      })
      .catch((cause) => {
        if (!cancelled)
          setCourseLoadError(
            cause instanceof Error ? cause.message : "Could not load courses.",
          );
      })
      .finally(() => {
        if (!cancelled) setCoursesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);
  // CREATE LESSON: Validates lesson data and sends the new lesson to the selected course API.
  async function create() {
    const missing = [
      !form.courseId && "course",
      !String(form.category || "").trim() && "category",
      !String(form.title || "").trim() && "title",
      !String(form.description || "").trim() && "description",
      !String(form.content || "").trim() && "content",
      (!Number.isInteger(Number(form.order)) || Number(form.order) < 1) &&
        "lesson order (a whole number greater than 0)",
    ].filter(Boolean);
    if (missing.length) {
      setFormError(`Please provide: ${missing.join(", ")}.`);
      return;
    }
    if (form.type === "video" && !form.videoUrl && !form.live) {
      setFormError("Upload a video file for this video lesson.");
      return;
    }
    setFormError("");
    const r = await fetch(`/api/courses/${form.courseId}/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setOpen(false);
      setForm({
        courseId: "",
        title: "",
        description: "",
        content: "",
        order: 1,
        type: "video",
        duration: 10,
        category: "",
        videoUrl: "",
        thumbnail: "",
        live: false,
        meetingUrl: "",
        published: true,
        preview: false,
        visibility: "premium",
      });
      setUploadedVideoName("");
      setVideoUploadError("");
      setFormError("");
      refresh();
    } else {
      const d = await r.json();
      setFormError(d.message || "Lesson could not be created.");
    }
    // DELETE LESSON: Deletes a selected lesson after confirmation.
  }
  async function del(id: string) {
    if (confirm("Delete this lesson?")) {
      await fetch(`/api/admin/lessons/${id}`, {
        method: "DELETE",
      });
      refresh();
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <div>
          <h2 className="text-xl font-bold">Lessons manager</h2>
          <p className="text-sm text-slate-500">
            Create video lessons and organize the course playlist.
          </p>
        </div>
        <button
          onClick={() => {
            setCoursesLoaded(false);
            setCourseLoadError("");
            setOpen(true);
          }}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
        >
          + Add lesson
        </button>
      </div>
      <Card>
        <div className="space-y-3">
          {(data?.lessons || []).map((l) => (
            <div
              key={l._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
            >
              <div>
                <div className="text-xs font-semibold text-indigo-600">
                  {(typeof l.courseId === "string" ? "" : l.courseId?.name) || "Course"}
                </div>
                <div className="font-bold">
                  {l.order}. {l.title}
                </div>
                <div className="text-sm text-slate-500">
                  {l.type} Â· {l.duration || 10} min{" "}
                  {l.videoUrl ? "Â· Video added" : "Â· No video"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={l.published ? "green" : "amber"}>
                  {l.published ? "LIVE" : "DRAFT"}
                </Badge>
                <button
                  onClick={() => del(l._id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!data?.lessons?.length && (
            <div className="py-10 text-center text-slate-500">
              No lessons created yet.
            </div>
          )}
        </div>
      </Card>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="relative w-full max-w-2xl">
            <div className="max-h-[92vh] w-full overflow-auto rounded-3xl bg-white p-6">
            <div className="flex justify-between">
              <div>
                <h2 className="text-2xl font-black">New lesson</h2>
                <p className="text-sm text-slate-500">
                  Add a lesson to the course playlist.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select
                value={form.courseId}
                disabled={!coursesLoaded || !courses.length}
                onChange={(e) =>
                  setForm({
                    ...form,
                    courseId: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3 md:col-span-2"
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {!coursesLoaded ? (
                <CourseHubLoader label="Loading courses..." className="md:col-span-2" />
              ) : courseLoadError ? (
                <p role="alert" className="text-sm text-rose-700 md:col-span-2">
                  {courseLoadError}
                </p>
              ) : !courses.length ? (
                <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 md:col-span-2">
                  Create a course before adding lessons.{" "}
                  <a href="/admin/courses" className="font-bold underline">
                    Open course manager
                  </a>
                  .
                </p>
              ) : null}
              <CategoryPicker
                value={form.category}
                onChange={(category) => setForm({ ...form, category })}
                label="Video category"
              />
              <input
                placeholder="Lesson title"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3"
              />
              <input
                type="number"
                min="1"
                placeholder="Order"
                value={form.order}
                onChange={(e) =>
                  setForm({
                    ...form,
                    order: Number(e.target.value),
                  })
                }
                className="rounded-xl border px-4 py-3"
              />
              <input
                type="number"
                min="1"
                placeholder="Duration (minutes)"
                value={form.duration}
                onChange={(e) =>
                  setForm({
                    ...form,
                    duration: Number(e.target.value),
                  })
                }
                className="rounded-xl border px-4 py-3"
              />
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3"
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="quiz">Quiz</option>
              </select>
              <div className="min-w-0 rounded-2xl border bg-slate-50 p-4 md:col-span-2">
                <div className="font-bold">Lesson video upload</div>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={videoUploading}
                  className="mt-2 block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const input = e.currentTarget;
                    setVideoUploadError("");
                    setUploadedVideoName("");
                    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
                    if (!allowedTypes.includes(f.type)) {
                      setVideoUploadError("Choose an MP4, WebM, or MOV video.");
                      input.value = "";
                      return;
                    }
                    if (f.size > 2 * 1024 * 1024 * 1024) {
                      setVideoUploadError("Video files must be 2 GB or smaller.");
                      input.value = "";
                      return;
                    }

                    setVideoUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", f);
                      const response = await fetch("/api/uploads", {
                        method: "POST",
                        body: fd,
                      });
                      const result = await response.json();
                      if (!response.ok || !result.url)
                        throw new Error(result.message || "Video upload failed.");
                      setForm((current) => ({
                        ...current,
                        videoUrl: result.url,
                      }));
                      setUploadedVideoName(f.name);
                    } catch (cause) {
                      setVideoUploadError(
                        cause instanceof Error
                          ? cause.message
                          : "Video upload failed. Please try again.",
                      );
                      input.value = "";
                    } finally {
                      setVideoUploading(false);
                    }
                  }}
                />
                <div aria-live="polite" className="mt-3 text-sm">
                  {videoUploading ? (
                    <p role="status" className="flex items-center gap-2 font-medium text-indigo-700">
                      <CSpinner className="coursehub-loader__mark--small" />
                      Uploading video… Keep this window open until it finishes.
                    </p>
                  ) : form.videoUrl ? (
                    <p role="status" className="break-words font-semibold text-emerald-700">
                      Video uploaded successfully{uploadedVideoName ? `: ${uploadedVideoName}` : "."}
                    </p>
                  ) : (
                    <p className="text-slate-500">
                      No video uploaded yet. Choose an MP4, WebM, or MOV file (up to 2 GB).
                    </p>
                  )}
                  {videoUploadError && (
                    <p role="alert" className="mt-2 break-words text-sm font-medium text-rose-700">
                      {videoUploadError}
                    </p>
                  )}
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border bg-slate-50 p-4 md:col-span-2">
                <div className="font-bold">Lesson thumbnail upload</div>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.append("file", f);
                    const r = await fetch("/api/uploads", {
                      method: "POST",
                      body: fd,
                    });
                    const d = await r.json();
                    if (r.ok)
                      setForm({
                        ...form,
                        thumbnail: d.url,
                      });
                    else alert(d.message || "Upload failed");
                  }}
                />
              </div>
              <textarea
                placeholder="Short description"
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="rounded-xl border px-4 py-3 md:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
                <input
                  type="checkbox"
                  checked={!!form.live}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      live: e.target.checked,
                    })
                  }
                />{" "}
                Live Zoom session (meeting link)
              </label>
              <input
                placeholder="Zoom meeting URL for live session"
                value={form.meetingUrl || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    meetingUrl: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3 md:col-span-2"
              />
              <textarea
                placeholder="Lesson content / notes"
                value={form.content}
                onChange={(e) =>
                  setForm({
                    ...form,
                    content: e.target.value,
                  })
                }
                rows={6}
                className="rounded-xl border px-4 py-3 md:col-span-2"
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.published}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      published: e.target.checked,
                    })
                  }
                />{" "}
                Published
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!form.preview}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preview: e.target.checked,
                      visibility: e.target.checked ? "public" : form.visibility,
                    })
                  }
                />{" "}
                Free preview for unsubscribed users
              </label>
              <div className="sm:col-span-2 rounded-2xl border bg-slate-50 p-4">
                <div className="font-bold">Who can watch this lesson?</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        visibility: "public",
                        preview: true,
                      })
                    }
                    aria-pressed={form.visibility === "public"}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${form.visibility === "public" ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200" : "bg-white"}`}
                  >
                    ðŸŒ Public / Free
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        visibility: "premium",
                        preview: false,
                      })
                    }
                    aria-pressed={form.visibility === "premium"}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${form.visibility === "premium" ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200" : "bg-white"}`}
                  >
                    ðŸ’Ž Premium / Subscriber
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-600" aria-live="polite">
                  {form.visibility === "public"
                    ? "Anyone can watch this lesson, including visitors without a subscription."
                    : "Only subscribers with active course access and admins can watch this lesson."}
                </p>
              </div>
            </div>
            {formError && (
              <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={videoUploading}
                className="rounded-xl border px-5 py-3"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={
                  videoUploading ||
                  !coursesLoaded ||
                  !courses.length ||
                  !!courseLoadError
                }
                className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {videoUploading ? "Uploading video…" : "Create lesson"}
              </button>
            </div>
          </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={videoUploading}
              aria-label="Close new lesson form"
              title="Close"
              className="absolute -right-3 -top-3 z-10 grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-4xl font-light leading-none text-slate-600 shadow-lg transition duration-200 hover:rotate-45 hover:border-red-600 hover:bg-red-600 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// USERS UI: Searchable users table with an admin remove action.
function Users({
  data,
  query,
  setQuery,
}: {
  data: AdminSectionData;
  query: string;
  setQuery: (s: string) => void;
}) {
  const [rows, setRows] = useState<AdminUser[]>(data.users || []);
  const filtered = rows.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  // REMOVE USER: Sends the selected user ID to the admin DELETE endpoint.
  async function remove(id: string) {
    const r = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
      }),
    });
    if (r.ok) setRows((current) => current.filter((u) => u._id !== id));
    else alert((await r.json()).message);
  }
  async function updateUser(id: string, changes: Record<string, unknown>) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.message || "Could not update this user.");
      return;
    }
    setRows((current) =>
      current.map((user) => user._id === id ? { ...user, ...result.user } : user),
    );
  }
  const permissions = [
    ["manage_community", "Manage groups and delete chat messages"],
    ["moderate_feed", "Delete any feed post"],
    ["manage_users", "Manage member messaging access"],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="text-sm text-slate-500">
            Customers and platform administrators.
          </p>
        </div>
        <input
          value={query}                                             
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users"
          className="rounded-xl border bg-white px-4 py-3"
        />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3">User</th>
                <th>Role</th>
                <th>Subscriptions</th>
                <th>Joined</th>
                <th>Admin controls</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="py-4">
                    <div className="font-bold">{u.name}</div>
                    <div className="text-sm text-slate-500">{u.email}</div>
                  </td>
                  <td>
                    <Badge tone={u.role === "admin" ? "green" : "default"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td>{u.subscriptionCount}</td>
                  <td>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "â€”"}
                  </td>
                  <td className="py-3">
                    {u.role === "admin" ? (
                      <span className="text-xs font-semibold text-slate-500">Full access</span>
                    ) : (
                      <div className="min-w-64 space-y-2">
                        {data?.currentUserRole === "admin" && (
                          <label className="flex items-center gap-2 text-xs font-semibold">
                            <span>Role</span>
                            <select
                              value={u.role === "subadmin" ? "subadmin" : "user"}
                              onChange={(event) => updateUser(u._id, {
                                role: event.target.value,
                                adminPermissions: event.target.value === "user" ? [] : (u.adminPermissions || []),
                              })}
                              className="rounded-lg border bg-white px-2 py-1.5"
                            >
                              <option value="user">User</option>
                              <option value="subadmin">Sub-admin</option>
                            </select>
                          </label>
                        )}
                        {u.role === "subadmin" && data?.currentUserRole === "admin" && (
                          <div className="space-y-1">
                            {permissions.map(([permission, label]) => (
                              <label key={permission} className="flex items-start gap-2 text-[11px] leading-4 text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={(u.adminPermissions || []).includes(permission)}
                                  onChange={(event) => {
                                    const current = u.adminPermissions || [];
                                    const next = event.target.checked
                                      ? [...current, permission]
                                      : current.filter((value: string) => value !== permission);
                                    updateUser(u._id, { adminPermissions: next });
                                  }}
                                  className="mt-0.5"
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        )}
                        {data?.currentUserRole === "admin" || data?.currentUserRole === "subadmin" ? (
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={u.canMessageAdmin === true}
                              onChange={(event) => updateUser(u._id, { canMessageAdmin: event.target.checked })}
                            />
                            Can message admins
                          </label>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td>
                    {u.role !== "admin" && (
                      <button
                        onClick={() => remove(u._id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
// SUBSCRIPTIONS UI: Searchable subscription table with customer, course, status, and dates.
function Subscriptions({
  data,
  query,
  setQuery,
  refresh,
}: {
  data: AdminSectionData;
  query: string;
  setQuery: (s: string) => void;
  refresh: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const rows = (data.subscriptions || []).filter((s) =>
    `${s.userId?.name} ${s.userId?.email} ${s.courseId?.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function grantAccess() {
    if (!userId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, durationDays }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Could not approve complimentary access.");
      setMessage("Complimentary subscriber access approved.");
      setUserId("");
      refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not approve complimentary access.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function revokeAccess(id: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Could not revoke complimentary access.");
      setMessage("Complimentary access revoked.");
      refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not revoke complimentary access.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Subscriptions</h2>
          <p className="text-sm text-slate-500">
            Billing access and course subscriptions.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subscriptionsâ€¦"
          className="rounded-xl border bg-white px-4 py-3"
        />
      </div>
      <Card>
        <div className="max-w-3xl">
          <h3 className="text-lg font-black">Approve complimentary access</h3>
          <p className="mt-1 text-sm text-slate-500">
            Grant a selected user subscriber access without a payment. Paid subscriptions still require payment verification.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
            <label className="sr-only" htmlFor="complimentary-user">Choose a user</label>
            <select
              id="complimentary-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">Choose a user</option>
              {(data.users || []).map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} — {user.email}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="complimentary-duration">Access duration</label>
            <select
              id="complimentary-duration"
              value={durationDays}
              onChange={(event) => setDurationDays(Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days</option>
            </select>
            <button
              type="button"
              disabled={!userId || busy}
              onClick={() => void grantAccess()}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Approve free access"}
            </button>
          </div>
          {message && (
            <p role="status" className="mt-3 text-sm font-semibold text-indigo-700">
              {message}
            </p>
          )}
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3">Customer</th>
                <th>Course</th>
                <th>Type</th>
                <th>Status</th>
                <th>Period end</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s._id} className="border-t">
                  <td className="py-4">
                    <div className="font-bold">
                      {s.userId?.name || "Unknown"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {s.userId?.email}
                    </div>
                  </td>
                  <td>{s.courseId?.name || "Unknown"}</td>
                  <td>
                    {s.provider === "admin" ? (
                      <span>
                        <Badge>Complimentary</Badge>
                        {s.grantedBy?.name && (
                          <span className="mt-1 block text-xs text-slate-500">
                            Approved by {s.grantedBy.name}
                          </span>
                        )}
                      </span>
                    ) : (
                      <Badge tone="amber">Paid</Badge>
                    )}
                  </td>
                  <td>
                    <Badge
                      tone={
                        ["active", "trialing", "paid"].includes(s.status || "") &&
                        (!s.currentPeriodEnd || new Date(s.currentPeriodEnd) > new Date())
                          ? "green"
                          : s.status === "canceled" ||
                              (s.currentPeriodEnd && new Date(s.currentPeriodEnd) <= new Date())
                            ? "red"
                            : "amber"
                      }
                    >
                      {s.status === "active" &&
                      s.currentPeriodEnd &&
                      new Date(s.currentPeriodEnd) <= new Date()
                        ? "expired"
                        : s.status}
                    </Badge>
                  </td>
                  <td>
                    {s.currentPeriodEnd
                      ? new Date(s.currentPeriodEnd).toLocaleDateString()
                      : "â€”"}
                  </td>
                  <td>
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString()
                      : "â€”"}
                  </td>
                  <td>
                    {s.provider === "admin" && s.status === "active" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revokeAccess(s._id)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Revoke free access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
// SEO DASHBOARD UI: Displays SEO score, issues, and Google-style course previews.
function SEO({ data, refresh }: { data: AdminSectionData; refresh: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <div>
          <h2 className="text-xl font-bold">SEO health</h2>
          <p className="text-sm text-slate-500">
            Course metadata audit and search preview.
          </p>
        </div>
        {refresh}
      </div>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="text-center">
          <div className="text-sm font-semibold text-slate-500">SEO Score</div>
          <div className="mt-4 text-6xl font-black gradient-text">
            {data?.score || 0}
          </div>
          <div className="mt-2">
            <Badge tone={(data?.score || 0) > 80 ? "green" : "amber"}>
              {(data?.score || 0) > 80 ? "Good" : "Needs work"}
            </Badge>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold">Issues to fix</h3>
          <div className="mt-4 space-y-3">
            {(data.issues || []).map((x, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <div>
                  <div className="font-semibold">{x.issue}</div>
                  <div className="text-sm text-slate-500">{x.page}</div>
                </div>
                <Badge
                  tone={
                    x.severity === "High"
                      ? "red"
                      : x.severity === "Medium"
                        ? "amber"
                        : "default"
                  }
                >
                  {x.severity}
                </Badge>
              </div>
            ))}
            {!data?.issues?.length && (
              <div className="rounded-xl bg-emerald-50 p-5 text-emerald-700">
                All audited course SEO fields look healthy.
              </div>
            )}
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="font-bold">Google-style previews</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(data.courses || []).map((c) => (
            <div key={c._id} className="rounded-2xl bg-slate-50 p-5">
              <div className="text-xs text-slate-500">
                coursehub.com/courses/{c.slug || "course"}
              </div>
              <div className="mt-1 text-lg font-semibold text-blue-700">
                {c.seoTitle || c.name}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {c.seoDescription || c.description}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
// LIVE MEETING UI: Admin form for publishing, updating, previewing, and ending the community meeting.
function MeetingAdmin() {
  const [m, setM] = useState<AdminMeeting | null>(null);
  const [form, setForm] = useState({
    title: "CourseHub Live Session",
    meetingUrl: "",
    provider: "zoom",
    startsAt: "",
    endsAt: "",
  });
  async function load(): Promise<AdminMeeting | null> {
    const response = await fetch("/api/community/meeting");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not load meeting settings.");
    return data.meeting || null;
  }
  useEffect(() => {
    load()
      .then((meeting) => {
        setM(meeting);
        if (meeting)
          setForm((current) => ({
            ...current,
            title: meeting.title,
            meetingUrl: meeting.meetingUrl,
            provider: meeting.provider || "other",
            startsAt: meeting.startsAt
              ? new Date(meeting.startsAt).toISOString().slice(0, 16)
              : "",
            endsAt: meeting.endsAt
              ? new Date(meeting.endsAt).toISOString().slice(0, 16)
              : "",
          }));
      })
      .catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not load meeting settings."));
  }, []);
  async function save() {
    const r = await fetch("/api/community/meeting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (!r.ok) return alert(d.message || "Could not save");
    setM(d.meeting as AdminMeeting);
    // END MEETING LISTING: Removes the active meeting from the community.
  }
  async function off() {
    await fetch("/api/community/meeting", {
      method: "DELETE",
    });
    setM(null);
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <Card>
        <h2 className="text-xl font-black">Live meeting</h2>
        <p className="mt-1 text-sm text-slate-500">
          Publish one active Zoom/Meet session for the community.
        </p>
        <div className="mt-5 space-y-3">
          <input
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
            placeholder="Meeting title"
            className="w-full rounded-xl border px-4 py-3"
          />
          <select
            value={form.provider}
            onChange={(e) =>
              setForm({
                ...form,
                provider: e.target.value,
              })
            }
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="zoom">Zoom</option>
            <option value="meet">Google Meet</option>
            <option value="other">Other</option>
          </select>
          <input
            value={form.meetingUrl}
            onChange={(e) =>
              setForm({
                ...form,
                meetingUrl: e.target.value,
              })
            }
            placeholder="Meeting URL"
            className="w-full rounded-xl border px-4 py-3"
          />
          <label className="block text-sm font-semibold">
            Starts
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) =>
                setForm({
                  ...form,
                  startsAt: e.target.value,
                })
              }
              className="mt-1 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="block text-sm font-semibold">
            Ends
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) =>
                setForm({
                  ...form,
                  endsAt: e.target.value,
                })
              }
              className="mt-1 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <button
            onClick={save}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white"
          >
            Publish live meeting
          </button>
          {m && (
            <button
              onClick={off}
              className="w-full rounded-xl border border-red-200 px-4 py-3 font-bold text-red-600"
            >
              End live listing
            </button>
          )}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">How students see it</h2>
        {m ? (
          <div className="mt-5 rounded-3xl border bg-gradient-to-br from-indigo-50 to-cyan-50 p-6">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              â— LIVE SESSION
            </span>
            <h3 className="mt-4 text-2xl font-black">{m.title}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {m.provider?.toUpperCase()} Â· meeting button appears on
              Community.
            </p>
            <a
              href={m.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
            >
              Open meeting
            </a>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            No active meeting. Publish one from the left.
          </div>
        )}
      </Card>
    </div>
  );
}
// PREMIUM PLANS UI: Admin interface for creating and managing paid subscription plans.
function PremiumAdmin() {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [f, setF] = useState<PremiumPlanForm>({
    name: "",
    slug: "",
    price: "",
    interval: "month",
    description: "",
    features: "",
    stripePriceId: "",
    paypalPlanId: "",
  });
  async function load(): Promise<PremiumPlan[]> {
    const response = await fetch("/api/admin/premium");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not load premium plans.");
    return data.plans || [];
  }
  useEffect(() => {
    load()
      .then(setPlans)
      .catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not load premium plans."));
  }, []);
  async function save() {
    const r = await fetch("/api/admin/premium", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...f,
        price: Number(f.price),
        features: f.features.split("\n").filter(Boolean),
      }),
    });
    if (r.ok) {
      setF({
        name: "",
        slug: "",
        price: "",
        interval: "month",
        description: "",
        features: "",
        stripePriceId: "",
        paypalPlanId: "",
      });
      load().then(setPlans).catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not load premium plans."));
    } else alert((await r.json()).message);
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-black">Premium plan</h2>
        <div className="mt-4 space-y-3">
          <input
            value={f.name}
            onChange={(e) =>
              setF({
                ...f,
                name: e.target.value,
              })
            }
            placeholder="Plan name"
            className="w-full rounded-xl border px-4 py-3"
          />
          <input
            value={f.slug}
            onChange={(e) =>
              setF({
                ...f,
                slug: e.target.value,
              })
            }
            placeholder="Slug"
            className="w-full rounded-xl border px-4 py-3"
          />
          <input
            type="number"
            value={f.price}
            onChange={(e) =>
              setF({
                ...f,
                price: e.target.value,
              })
            }
            placeholder="Price"
            className="w-full rounded-xl border px-4 py-3"
          />
          <select
            value={f.interval}
            onChange={(e) =>
              setF({
                ...f,
                interval: e.target.value === "year" ? "year" : "month",
              })
            }
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
          <textarea
            value={f.description}
            onChange={(e) =>
              setF({
                ...f,
                description: e.target.value,
              })
            }
            placeholder="Description"
            className="w-full rounded-xl border px-4 py-3"
          />
          <input
            value={f.stripePriceId}
            onChange={(e) =>
              setF({
                ...f,
                stripePriceId: e.target.value,
              })
            }
            placeholder="Stripe Price ID (optional)"
            className="w-full rounded-xl border px-4 py-3"
          />
          <input
            value={f.paypalPlanId}
            onChange={(e) =>
              setF({
                ...f,
                paypalPlanId: e.target.value,
              })
            }
            placeholder="PayPal Plan ID (optional; auto-created if blank)"
            className="w-full rounded-xl border px-4 py-3"
          />
          <textarea
            value={f.features}
            onChange={(e) =>
              setF({
                ...f,
                features: e.target.value,
              })
            }
            placeholder="One feature per line"
            rows={6}
            className="w-full rounded-xl border px-4 py-3"
          />
          <button
            onClick={save}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white"
          >
            Create plan
          </button>
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Plans shown under Premium</h2>
        <div className="mt-4 space-y-3">
          {plans.map((p) => (
            <div key={p._id} className="rounded-2xl border p-4">
              <div className="flex justify-between">
                <b>{p.name}</b>
                <b>
                  ${p.price}/{p.interval}
                </b>
              </div>
              <p className="mt-1 text-sm text-slate-500">{p.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// PAYMENTS UI: Displays payment records and payment verification controls.

function Payments() {
  const [items, setItems] = useState<AdminPayment[]>([]);
  async function load(): Promise<AdminPayment[]> {
    const response = await fetch("/api/admin/payments");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not load payments.");
    return data.payments || [];
  }
  useEffect(() => {
    load()
      .then(setItems)
      .catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not load payments."));
  }, []);
  // VERIFY PAYMENT: Calls the backend verification endpoint for a selected payment.
  async function verify(id: string, status: string) {
    const r = await fetch("/api/admin/payments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        status,
      }),
    });
    if (!r.ok) alert((await r.json()).message || "Update failed");
    else load()
      .then(setItems)
      .catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not load payments."));
  }
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Payments & bank verification</h2>
          <p className="text-sm text-slate-500">
            Review Stripe, PayPal and bank-transfer records.
          </p>
        </div>
        <a
          href="/api/admin/export?type=payments"
          className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"
        >
          Payments Excel
        </a>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((p) => (
          <div
            key={p._id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border p-4"
          >
            <div className="min-w-[220px] flex-1">
              <b>{p.userId?.name || "User"}</b>
              <div className="text-xs text-slate-500">
                {p.userId?.email} Â· {p.provider} Â· {p.planId?.name || "Plan"}
              </div>
            </div>
            <b>${p.amount}</b>
            <Badge
              tone={
                p.status === "paid"
                  ? "green"
                  : p.status === "verification_pending"
                    ? "amber"
                    : "default"
              }
            >
              {p.status}
            </Badge>
            {p.status === "verification_pending" && (
              <button
                onClick={() => verify(p._id, "paid")}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
              >
                Verify
              </button>
            )}
            <button
              onClick={() => verify(p._id, "failed")}
              className="rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600"
            >
              Fail
            </button>
          </div>
        ))}
        {!items.length && (
          <div className="py-12 text-center text-slate-500">
            No payments yet.
          </div>
        )}
      </div>
    </Card>
  );
}
// BLOG ADMIN UI: Creates and updates Study Blog content.
function BlogAdmin() {
  type BlogDraft = {
    _id?: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    category: string;
    published: boolean;
    createdAt?: string;
    updatedAt?: string;
  };

  const emptyForm = {
    title: "",
    excerpt: "",
    content: "",
    coverImage: "",
    category: "",
    published: true,
  };

  const [form, setForm] = useState<BlogDraft>(emptyForm);
  const [posts, setPosts] = useState<BlogDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);

  const fetchPosts = useCallback(async (): Promise<BlogDraft[]> => {
    const response = await fetch("/api/blog?admin=true");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not load blog posts.");
    return data.posts || [];
  }, []);

  async function loadPosts() {
    try {
      setPosts(await fetchPosts());
    } catch (error) {
      setNoticeIsError(true);
      setNotice(error instanceof Error ? error.message : "Could not load blog posts.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchPosts()
      .then((loadedPosts) => {
        if (!cancelled) setPosts(loadedPosts);
      })
      .catch((error) => {
        if (cancelled) return;
        setNoticeIsError(true);
        setNotice(error instanceof Error ? error.message : "Could not load blog posts.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPosts]);

  async function save() {
    setBusy(true);
    setNotice("");
    try {
      const payload = {
        ...form,
        id: editingId || undefined,
      };
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch("/api/blog", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(d.message || "Could not save the blog post.");

      setNoticeIsError(false);
      const publicationMessage = d.post?.published
        ? editingId
          ? "Blog post updated successfully."
          : "Blog post published successfully."
        : "Blog draft saved successfully.";
      setNotice(publicationMessage);
      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      await loadPosts();
    } catch (error) {
      setNoticeIsError(true);
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not save the blog post.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(postId: string) {
    if (!confirm("Delete this blog post?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/blog", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: postId }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Could not delete the blog post.");
      setNoticeIsError(false);
      setNotice("Blog post deleted successfully.");
      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      await loadPosts();
    } catch (error) {
      setNoticeIsError(true);
      setNotice(error instanceof Error ? error.message : "Could not delete the blog post.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(post: BlogDraft) {
    setEditingId(post._id || null);
    setForm({
      _id: post._id,
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content || "",
      coverImage: post.coverImage || "",
      category: post.category || "",
      published: Boolean(post.published),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setNotice("");
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Study Blog CMS</h2>
            <p className="mt-1 text-sm text-slate-500">
              Publish study guides, tutorials and learning notes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {formOpen && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setFormOpen(false);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
              >
                {editingId ? "Cancel edit" : "Close"}
              </button>
            )}
            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
            >
              Create post
            </button>
          </div>
        </div>
        {notice && (
          <div
            role={noticeIsError ? "alert" : "status"}
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${noticeIsError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
          >
            {notice}
          </div>
        )}
        {formOpen && <div className="mt-5 grid gap-4">
          <input
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
            placeholder="Article title"
            className="rounded-xl border px-4 py-3"
          />
          <CategoryPicker
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
            label="Blog category"
          />
          <textarea
            value={form.excerpt}
            onChange={(e) =>
              setForm({
                ...form,
                excerpt: e.target.value,
              })
            }
            placeholder="Short excerpt"
            rows={3}
            className="rounded-xl border px-4 py-3"
          />
          <div className="rounded-2xl border bg-slate-50 p-4">
            <label className="block text-sm font-bold" htmlFor="blog-cover">
              Blog cover image
            </label>
            <input
              id="blog-cover"
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              disabled={uploadingCover}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  setNoticeIsError(true);
                  setNotice("Blog cover images must be 10 MB or smaller.");
                  event.target.value = "";
                  return;
                }
                setUploadingCover(true);
                setNotice("");
                try {
                  const body = new FormData();
                  body.append("file", file);
                  body.append("kind", "blog");
                  const response = await fetch("/api/community/upload", {
                    method: "POST",
                    body,
                  });
                  const result = await response.json();
                  if (!response.ok)
                    throw new Error(result.message || "Could not upload the blog cover.");
                  setForm((current: BlogDraft) => ({
                    ...current,
                    coverImage: result.url,
                  }));
                } catch (error) {
                  setNoticeIsError(true);
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "Could not upload the blog cover.",
                  );
                } finally {
                  setUploadingCover(false);
                  event.target.value = "";
                }
              }}
            />
            {form.coverImage && (
              <div className="mt-3">
                <Image
                  src={form.coverImage}
                  alt="Blog cover preview"
                  className="max-h-56 w-full rounded-xl object-cover"
                  width={960}
                  height={480}
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, coverImage: "" })}
                  className="mt-2 text-xs font-bold text-red-600"
                >
                  Remove cover image
                </button>
              </div>
            )}
          </div>
          <textarea
            value={form.content}
            onChange={(e) =>
              setForm({
                ...form,
                content: e.target.value,
              })
            }
            placeholder="Full article content"
            rows={12}
            className="rounded-xl border px-4 py-3"
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                setForm({
                  ...form,
                  published: e.target.checked,
                })
              }
            />{" "}
            Publish immediately
          </label>
          <button
            disabled={busy || uploadingCover}
            onClick={save}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
          >
            {uploadingCover ? "Uploading cover…" : busy ? (editingId ? "Saving…" : "Publishing…") : editingId ? "Save article" : "Publish article"}
          </button>
        </div>}
      </Card>

      <Card>
        <h3 className="text-lg font-black">Existing blog posts</h3>
        <div className="mt-4 space-y-3">
          {loadingPosts ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading posts…</div>
          ) : posts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No blog posts yet.</div>
          ) : (
            posts.map((post) => (
              <div
                key={post._id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate text-base">{post.title}</b>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {post.category || "Uncategorized"} · {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "Recently"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(post)}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(post._id || "")}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
// COMMUNITY ADMIN UI: Creates, edits, and deletes community groups.
function CommunityAdmin() {
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [memberEditGroup, setMemberEditGroup] = useState("");
  const [memberSelection, setMemberSelection] = useState<string[]>([]);
  const [allEligibleUsers, setAllEligibleUsers] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    audience: "subscribers",
    avatarUrl: "",
  });
  async function load(): Promise<{ groups: CommunityGroup[]; members: CommunityMember[] }> {
    const [groupResponse, memberResponse] = await Promise.all([
      fetch("/api/community/groups"),
      fetch("/api/community/admin/members"),
    ]);
    const [groupData, memberData] = await Promise.all([
      groupResponse.json(),
      memberResponse.json(),
    ]);
    if (!groupResponse.ok || !memberResponse.ok)
      throw new Error(groupData.message || memberData.message || "Could not load community management data.");
    return { groups: groupData.groups || [], members: memberData.users || [] };
  }
  function applyLoadedData(data: { groups: CommunityGroup[]; members: CommunityMember[] }) {
    setGroups(data.groups);
    setMembers(data.members);
  }
  async function refreshData() {
    applyLoadedData(await load());
  }
  useEffect(() => {
    load()
      .then(applyLoadedData)
      .catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not load community management data."));
  }, []);
  // CREATE LESSON: Validates lesson data and sends the new lesson to the selected course API.
  async function create() {
    if (!form.name) return;
    const r = await fetch("/api/community/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setForm({
        name: "",
        description: "",
        audience: "subscribers",
        avatarUrl: "",
      });
      refreshData().catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not refresh community groups."));
    } else alert((await r.json()).message);
    // DELETE LESSON: Deletes a selected lesson after confirmation.
  }
  async function uploadGroupAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Choose an image file for the group photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Group photos must be 10 MB or smaller.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "group");
      const response = await fetch("/api/community/upload", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.url)
        throw new Error(data.message || "Group photo upload failed.");
      setForm((current) => ({ ...current, avatarUrl: data.url }));
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Group photo upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }
  async function updateGroupAvatar(group: CommunityGroup, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      alert("Choose an image file up to 10 MB.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "group");
      const uploadResponse = await fetch("/api/community/upload", {
        method: "POST",
        body,
      });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || !uploaded.url)
        throw new Error(uploaded.message || "Group photo upload failed.");
      const response = await fetch(`/api/community/groups/${group._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploaded.url }),
      });
      const updated = await response.json();
      if (!response.ok)
        throw new Error(updated.message || "Could not update group photo.");
      await refreshData();
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "Could not update group photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }
  async function del(id: string) {
    if (confirm("Delete this group?")) {
      await fetch(`/api/community/groups/${id}`, {
        method: "DELETE",
      });
      refreshData().catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not refresh community groups."));
    }
    // EDIT GROUP: Updates the selected community group.
  }
  async function edit(g: CommunityGroup) {
    const name = prompt("Group name", g.name);
    if (!name) return;
    const description = prompt("Group description", g.description || "");
    const audience =
      prompt("Audience: subscribers or everyone", g.audience) || g.audience;
    await fetch(`/api/community/groups/${g._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        audience,
        active: true,
      }),
    });
    refreshData().catch((error: unknown) => alert(error instanceof Error ? error.message : "Could not refresh community groups."));
  }
  async function manageMembers(group: CommunityGroup) {
    if (memberEditGroup === group._id) {
      setMemberEditGroup("");
      return;
    }
    setMemberEditGroup(group._id);
    const assignedMembers = (group.memberIds || []).map(String);
    setMemberSelection(assignedMembers);
    setAllEligibleUsers(!group.memberAccessRestricted && assignedMembers.length === 0);
  }
  async function saveMembers(group: CommunityGroup) {
    const response = await fetch(`/api/community/groups/${group._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberIds: allEligibleUsers ? [] : memberSelection,
        memberAccessRestricted: !allEligibleUsers,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.message || "Could not update group members.");
      return;
    }
    setGroups((current) => current.map((item) => item._id === group._id ? result.group as CommunityGroup : item));
    setMemberEditGroup("");
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-black">Create group</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create as many subscriber or public groups as needed.
        </p>
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-50 text-2xl">
              {form.avatarUrl ? (
                <Image
                  src={form.avatarUrl}
                  alt="Group photo preview"
                  className="h-full w-full object-cover"
                  width={56}
                  height={56}
                  unoptimized
                />
              ) : "👥"}
            </div>
            <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              {uploadingAvatar ? "Uploading…" : "Add group photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingAvatar}
                onChange={(event) => uploadGroupAvatar(event.target.files?.[0])}
              />
            </label>
          </div>
          <input
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            placeholder="Group name"
            className="w-full rounded-xl border px-4 py-3"
          />
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
            placeholder="Description"
            rows={4}
            className="w-full rounded-xl border px-4 py-3"
          />
          <select
            value={form.audience}
            onChange={(e) =>
              setForm({
                ...form,
                audience: e.target.value,
              })
            }
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="subscribers">Subscribers only</option>
            <option value="everyone">Everyone</option>
          </select>
          <button
            onClick={create}
            disabled={uploadingAvatar}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white"
          >
            Create group
          </button>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Groups</h2>
            <p className="text-sm text-slate-500">
              Admin has full group control.
            </p>
          </div>
          <Badge tone="green">{groups.length} groups</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {groups.map((g) => (
            <div
              key={g._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-50 text-xl">
                  {g.avatarUrl ? (
                    <Image
                      src={g.avatarUrl}
                      alt={`${g.name} group`}
                      className="h-full w-full object-cover"
                      width={48}
                      height={48}
                      unoptimized
                    />
                  ) : "👥"}
                </div>
                <div className="min-w-0">
                <div className="font-bold">{g.name}</div>
                <div className="text-sm text-slate-500">{g.description}</div>
                <div className="mt-1 text-xs text-indigo-600">
                  {g.audience === "subscribers" ? "Subscriber only" : "Public"}
                </div>
                </div>
              </div>
              <div className="flex gap-2">
                <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm">
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={(event) => updateGroupAvatar(g, event.target.files?.[0])}
                  />
                </label>
                <button
                  onClick={() => edit(g)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => del(g._id)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
              {memberEditGroup === g._id && (
                <div className="w-full border-t pt-3">
                  <p className="mb-2 text-xs text-slate-500">
                    Add or remove individual people from this group. When access is limited, only checked people can enter.
                  </p>
                  <label className="flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-xs font-semibold text-indigo-800">
                    <input
                      type="checkbox"
                      checked={!allEligibleUsers}
                      onChange={(event) => {
                        const restrict = event.target.checked;
                        setAllEligibleUsers(!restrict);
                        if (restrict && !memberSelection.length)
                          setMemberSelection(members.map((member) => String(member._id)));
                      }}
                    />
                    Limit access to selected members
                  </label>
                  {allEligibleUsers ? (
                    <p className="mt-2 text-xs text-emerald-700">All eligible users currently have access.</p>
                  ) : (
                    <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                      {members.map((member) => (
                        <label key={member._id} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <input
                            type="checkbox"
                            checked={memberSelection.includes(String(member._id))}
                            onChange={(event) => setMemberSelection((current) =>
                              event.target.checked
                                ? [...current, String(member._id)]
                                : current.filter((id) => id !== String(member._id)),
                            )}
                          />
                          <span className="min-w-0 truncate">{member.name} <span className="text-slate-400">{member.username ? `@${member.username}` : member.email}</span></span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => saveMembers(g)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Save access</button>
                    <button onClick={() => { setAllEligibleUsers(true); setMemberSelection([]); }} className="rounded-lg border px-3 py-2 text-xs">Allow all eligible users</button>
                  </div>
                </div>
              )}
              {memberEditGroup !== g._id && (
                <button
                  onClick={() => manageMembers(g)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Manage members
                </button>
              )}
            </div>
          ))}
          {!groups.length && (
            <div className="py-10 text-center text-slate-500">
              Create your first community group.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
