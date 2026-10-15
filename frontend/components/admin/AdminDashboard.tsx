"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import CourseHubLogo from "@/components/CourseHubLogo";

type DashboardDays = 7 | 30 | 90 | 365;

type DashboardStats = {
  revenue?: number;
  monthlyRevenue?: number;
  transactions?: number;
  users?: number;
  newUsers?: number;
  courses?: number;
  lessons?: number;
  contentHealth?: number;
  activeLearners?: number;
  paidUsers?: number;
  coursesWithLessons?: number;
  publishedCourses?: number;
};

type DashboardMonth = {
  _id?: { label?: string; m?: number; y?: number };
  revenue?: number;
  transactions?: number;
};

type DashboardCourse = {
  _id?: string;
  name?: string;
  views?: number;
};

type AdminDashboardData = {
  monthlyRevenueTarget?: number;
  stats?: DashboardStats;
  topCourses?: DashboardCourse[];
  monthly?: DashboardMonth[];
  trends?: { revenue?: number };
};

type DashboardProps = {
  data: AdminDashboardData | null;
  detailed: boolean;
  days: DashboardDays;
  onDaysChange: (days: DashboardDays) => void;
  onRefresh: () => void;
};

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function IconBox({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}

function Trend({
  value,
  down = false,
}: {
  value: string;
  down?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold ${
        down ? "text-rose-500" : "text-emerald-500"
      }`}
    >
      <span className="text-sm">{down ? "↘" : "↗"}</span>
      {value}
    </span>
  );
}

export default function AdminDashboard({
  data,
  detailed,
  days,
  onDaysChange,
  onRefresh,
}: DashboardProps) {
  const [search, setSearch] = useState("");
  const monthlyTarget = Number(data?.monthlyRevenueTarget) || 1000;
  const [targetInput, setTargetInput] = useState(String(monthlyTarget));
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetMessage, setTargetMessage] = useState("");

  const stats = data?.stats || {};
  const topCourses = data?.topCourses || [];
  const monthly = data?.monthly || [];

  const revenue = Number(stats.revenue || 0);
  const monthlyRevenue = Number(stats.monthlyRevenue || 0);
  const revenueTrend = data?.trends?.revenue;
  const transactions = Number(stats.transactions || 0);
  const users = Number(stats.users || 0);
  const newUsers = Number(stats.newUsers || 0);
  const courses = Number(stats.courses || 0);
  const lessons = Number(stats.lessons || 0);
  const targetProgress = Math.min(
    100,
    Math.round((monthlyRevenue / monthlyTarget) * 100),
  );
  const contentHealth = Number(stats.contentHealth || 0);
  const activeLearners = Number(stats.activeLearners || 0);
  const paidUsers = Number(stats.paidUsers || 0);
  const activeLearnerShare = Math.min(
    100,
    Math.round((activeLearners / Math.max(users, 1)) * 100),
  );

  async function saveMonthlyTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTarget(true);
    setTargetMessage("");

    try {
      const response = await fetch("/api/admin/analytics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyRevenueTarget: Number(targetInput),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save monthly target.");
      }
      setTargetMessage("Monthly target saved.");
      onRefresh();
    } catch (error) {
      setTargetMessage(
        error instanceof Error ? error.message : "Could not save monthly target.",
      );
    } finally {
      setSavingTarget(false);
    }
  }

  const maxRevenue = Math.max(
    ...monthly.map((month) => Number(month.revenue) || 0),
    1
  );

  const chartPoints = monthly.map((month, index) => {
    const value = Number(month.revenue) || 0;

    const x =
      monthly.length <= 1
        ? 50
        : (index / (monthly.length - 1)) * 100;

    const normalized = value / maxRevenue;
    const y = 94 - normalized * 88;

    return {
      x,
      y,
      value,
      month,
    };
  });
  const hasChartRevenue = chartPoints.some((point) => point.value > 0);
  const chartLabelCount = Math.min(monthly.length, 6);
  const chartLabelIndexes = Array.from(
    new Set(
      Array.from({ length: chartLabelCount }, (_, index) =>
        Math.round(
          (index * (monthly.length - 1)) / Math.max(chartLabelCount - 1, 1),
        ),
      ),
    ),
  );

  const linePath =
    chartPoints.length > 1
      ? chartPoints
          .map((point, index) => {
            if (index === 0) {
              return `M ${point.x} ${point.y}`;
            }

            const previous = chartPoints[index - 1];

            const controlX1 =
              previous.x + (point.x - previous.x) * 0.45;

            const controlX2 =
              previous.x + (point.x - previous.x) * 0.75;

            return `C ${controlX1} ${previous.y}, ${controlX2} ${point.y}, ${point.x} ${point.y}`;
          })
          .join(" ")
      : "";

  const areaPath =
    chartPoints.length > 1
      ? `${linePath} L 100 100 L 0 100 Z`
      : "";

  const periodLabel =
    days === 7
      ? "Last 7 days"
      : days === 30
        ? "Last 30 days"
        : days === 90
          ? "Last 90 days"
          : "Last 365 days";

  const statCards = [
    {
      label: "Total Users",
      value: users.toLocaleString(),
      subtitle: periodLabel,
      trend: "11%",
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      iconClass: "bg-emerald-50 text-emerald-500",
    },
    {
      label: "Total Courses",
      value: courses.toLocaleString(),
      subtitle: "Published courses",
      trend: "8%",
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>
      ),
      iconClass: "bg-sky-50 text-sky-500",
    },
    {
      label: "Total Lessons",
      value: lessons.toLocaleString(),
      subtitle: "Learning content",
      trend: "14%",
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      ),
      iconClass: "bg-violet-50 text-violet-500",
    },
    {
      label: "Total Revenue",
      value: `$${revenue.toLocaleString()}`,
      subtitle: periodLabel,
      trend: "17%",
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 1v22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      iconClass: "bg-amber-50 text-amber-500",
    },
  ];

  const filteredCourses = topCourses
    .filter((course) => {
      if (!search.trim()) return true;

      const name = String(course?.name || "").toLowerCase();

      return name.includes(search.trim().toLowerCase());
    })
    .slice(0, 5);

  return (
    <div className="min-w-0 space-y-4 bg-slate-50/60 p-0 sm:space-y-6 sm:p-1">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              <CourseHubLogo size="sm" /> <span>Admin</span>
            </h1>

            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 sm:inline-flex">
              Live
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Welcome back! Here&apos;s what&apos;s happening with your
            platform.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          {/* SEARCH */}
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none lg:w-72">
            <svg
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
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          {/* PERIOD DROPDOWN */}
          <div className="relative min-w-0 sm:flex-none">
            <select
              value={days}
              onChange={(e) =>
                onDaysChange(
                  Number(e.target.value) as DashboardDays
                )
              }
              className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 sm:w-auto sm:min-w-[165px]"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>

            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="group min-w-0 p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium leading-4 text-slate-500 sm:text-sm">
                  {card.label}
                </p>

                <p className="mt-2 truncate text-xl font-black tracking-tight text-slate-900 sm:mt-3 sm:text-3xl">
                  {card.value}
                </p>
              </div>

              <IconBox className={`h-9 w-9 rounded-lg sm:h-11 sm:w-11 sm:rounded-xl ${card.iconClass}`}>
                {card.icon}
              </IconBox>
            </div>

            <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-1 gap-y-1 sm:mt-4">
              <span className="min-w-0 text-[10px] leading-4 text-slate-400 sm:text-xs">
                {card.subtitle}
              </span>

              <Trend value={card.trend} />
            </div>
          </Card>
        ))}
      </div>

      {/* SALES ANALYTICS + TARGET */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)] sm:gap-5">
        {/* SALES ANALYTICS */}
        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Sales Analytics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Revenue performance for {periodLabel.toLowerCase()}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {detailed ? "Detailed Analytics" : "Overview"}
            </div>
          </div>

          {/* SUMMARY */}
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
              <p className="text-xs text-slate-400">
                Income
              </p>

              <p className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                ${revenue.toLocaleString()}
              </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Paid transactions</p>
                <p className="mt-1 text-lg font-bold text-slate-700">
                  {transactions.toLocaleString()}
                </p>
                {typeof revenueTrend === "number" ? (
                  <div className="mt-1">
                    <Trend
                      value={`${Math.abs(revenueTrend)}% vs previous period`}
                      down={revenueTrend < 0}
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    No previous-period comparison
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CHART */}
          <div className="relative mt-8 h-72 overflow-hidden">
            <div className="absolute right-0 top-0 z-[1] flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-[#4fd1b5]" />
              Paid revenue
            </div>

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-8 pt-2">
              {[100, 75, 50, 25, 0].map((value) => (
                <div
                  key={value}
                  className="flex items-center gap-3"
                >
                  <span className="w-8 text-right text-[10px] text-slate-400">
                    {value === 0
                      ? "0"
                      : `$${Math.round(
                          (maxRevenue * value) / 100
                        ).toLocaleString()}`}
                  </span>

                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              ))}
            </div>

            {chartPoints.length > 1 && hasChartRevenue ? (
              <>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Paid revenue graph for ${periodLabel.toLowerCase()}`}
                  className="absolute bottom-8 left-10 right-0 top-2 h-auto w-[calc(100%-2.5rem)] overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="dashboardArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#6ee7c7"
                        stopOpacity="0.35"
                      />

                      <stop
                        offset="100%"
                        stopColor="#6ee7c7"
                        stopOpacity="0.02"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d={areaPath}
                    fill="url(#dashboardArea)"
                  />

                  <path
                    d={linePath}
                    fill="none"
                    stroke="#4fd1b5"
                    strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke"
                  />

                  {chartPoints.map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="1.3"
                        fill="white"
                        stroke="#4fd1b5"
                        strokeWidth="0.8"
                        vectorEffect="non-scaling-stroke"
                      >
                        <title>
                          {point.month?._id?.label || `Point ${index + 1}`}:
                          {" "}${Number(point.value).toLocaleString()} paid
                          revenue
                          {point.month?.transactions != null
                            ? ` (${point.month.transactions} transactions)`
                            : ""}
                        </title>
                      </circle>
                    ))}
                </svg>

                <div className="absolute bottom-0 left-10 right-0 h-5">
                  {chartLabelIndexes.map((index) => {
                    const point = chartPoints[index];
                    const label =
                      point.month?._id?.label ||
                      (point.month?._id?.m
                        ? `${point.month._id.m}/${String(
                            point.month._id.y || "",
                          ).slice(-2)}`
                        : `Point ${index + 1}`);
                    const alignment =
                      point.x === 0
                        ? "translate-x-0"
                        : point.x === 100
                          ? "-translate-x-full"
                          : "-translate-x-1/2";

                    return (
                      <span
                        key={index}
                        className={`absolute whitespace-nowrap text-[10px] text-slate-400 ${alignment}`}
                        style={{ left: `${point.x}%` }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="rounded-xl border border-dashed border-slate-200 px-6 py-5 text-center">
                  <p className="font-semibold text-slate-600">
                    No paid income recorded for this period
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    The graph will show transactions after a payment is recorded as paid.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* SALES TARGET */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Sales Target
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Monthly performance
              </p>
            </div>

          </div>

          <div className="mt-8 flex justify-center">
            <div className="relative h-52 w-52">
              <svg
                viewBox="0 0 220 220"
                className="h-full w-full -rotate-90"
              >
                <circle
                  cx="110"
                  cy="110"
                  r="82"
                  fill="none"
                  stroke="#edf1f1"
                  strokeWidth="18"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100 100"
                />

                <circle
                  cx="110"
                  cy="110"
                  r="82"
                  fill="none"
                  stroke="#5ed8bd"
                  strokeWidth="18"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${targetProgress} 100`}
                />
              </svg>

              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-3xl font-black text-slate-900">
                    {targetProgress}%
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Monthly goal
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />

                <div>
                  <p className="text-xs text-slate-400">
                    Paid income this month
                  </p>

                  <p className="font-black text-slate-800">
                    ${monthlyRevenue.toLocaleString()}
                  </p>
                </div>
              </div>

              <span className="text-sm font-bold text-slate-500">{targetProgress}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-slate-300" />

                <div>
                  <p className="text-xs text-slate-400">
                    Monthly revenue target
                  </p>

                  <p className="font-black text-slate-800">
                    ${monthlyTarget.toLocaleString()}
                  </p>
                </div>
              </div>

              <span className="text-sm font-bold text-slate-500">USD</span>
            </div>

            <form onSubmit={saveMonthlyTarget} className="border-t border-slate-100 pt-4">
              <label
                htmlFor="monthly-revenue-target"
                className="mb-2 block text-xs font-semibold text-slate-500"
              >
                Set monthly target (USD)
              </label>
              <div className="flex gap-2">
                <input
                  id="monthly-revenue-target"
                  type="number"
                  min="1"
                  max="1000000000"
                  step="0.01"
                  required
                  value={targetInput}
                  onChange={(event) => setTargetInput(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingTarget ? "Saving..." : "Save"}
                </button>
              </div>
              {targetMessage ? (
                <p
                  aria-live="polite"
                  className={`mt-2 text-xs ${
                    targetMessage === "Monthly target saved."
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {targetMessage}
                </p>
              ) : null}
            </form>
          </div>
        </Card>
      </div>

      {/* TOP COURSES */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)] sm:gap-5">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Top Courses
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Courses people have viewed most
              </p>
            </div>

            <Link
              href="/admin/courses"
              className="flex items-center gap-1 text-sm font-bold text-emerald-500 hover:text-emerald-600"
            >
              View all
              <span>→</span>
            </Link>
          </div>

          {filteredCourses.length ? (
            <div className="divide-y divide-slate-100">
              {filteredCourses.map(
                (course, index) => {
                  const viewCount = Number(course.views) || 0;
                  const topViewCount = Math.max(
                    ...filteredCourses.map((item) => Number(item.views) || 0),
                    1,
                  );
                  const progress = Math.round(
                    (viewCount / topViewCount) * 100,
                  );

                  return (
                    <div
                      key={
                        course._id ||
                        course.name ||
                        index
                      }
                      className="flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:p-5"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-500">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {course.name}
                          </p>

                          <span className="shrink-0 text-xs font-semibold text-slate-400">
                            {viewCount.toLocaleString()}{" "}
                            {viewCount === 1 ? "view" : "views"}
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center p-6 text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                    <path d="m3 12 9 5 9-5" />
                    <path d="m3 17 9 5 9-5" />
                  </svg>
                </div>

                <p className="mt-4 font-bold text-slate-700">
                  No course views recorded yet
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Published courses appear here after visitors open them.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* PLATFORM OVERVIEW */}
        <Card className="p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Platform Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current system activity
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <IconBox className="h-10 w-10 bg-blue-50 text-blue-500">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                </IconBox>

                <div>
                  <p className="text-xs text-slate-400">
                    Users
                  </p>

                  <p className="font-black text-slate-800">
                    {users.toLocaleString()}
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-400">
                {newUsers.toLocaleString()} new
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <IconBox className="h-10 w-10 bg-violet-50 text-violet-500">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                  </svg>
                </IconBox>

                <div>
                  <p className="text-xs text-slate-400">
                    Lessons
                  </p>

                  <p className="font-black text-slate-800">
                    {lessons.toLocaleString()}
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-400">
                Published
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <IconBox className="h-10 w-10 bg-emerald-50 text-emerald-500">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M20 7h-9a4 4 0 0 0 0 8h9" />
                    <path d="M4 11h16" />
                    <path d="M20 7v10" />
                  </svg>
                </IconBox>

                <div>
                  <p className="text-xs text-slate-400">
                    Revenue
                  </p>

                  <p className="font-black text-slate-800">
                    ${revenue.toLocaleString()}
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-400">
                {transactions.toLocaleString()} transactions
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
            <p className="text-xs font-semibold text-emerald-600">
              Growth signal
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800">
              {activeLearners.toLocaleString()} active{" "}
              {activeLearners === 1 ? "learner" : "learners"}
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                style={{ width: `${activeLearnerShare}%` }}
              />
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              Active learners over the {days}-day reporting period
            </p>
          </div>
        </Card>
      </div>

      {/* BOTTOM INFO */}
      <div className="grid min-w-0 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <IconBox className="bg-emerald-50 text-emerald-500">
              ✓
            </IconBox>

            <div>
              <p className="text-xs text-slate-400">
                Content Health
              </p>

              <p className="font-black text-slate-800">
                {contentHealth}% with lessons
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {Number(stats.coursesWithLessons || 0).toLocaleString()} of{" "}
                {Number(stats.publishedCourses || 0).toLocaleString()} published
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <IconBox className="bg-blue-50 text-blue-500">
              ↗
            </IconBox>

            <div>
              <p className="text-xs text-slate-400">
                Growth Signal
              </p>

              <p className="font-black text-slate-800">
                {activeLearners.toLocaleString()} active learners
              </p>
              <p className="mt-1 text-xs text-slate-500">
                In the last {days} days
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <IconBox className="bg-amber-50 text-amber-500">
              $
            </IconBox>

            <div>
              <p className="text-xs text-slate-400">
                Revenue Signal
              </p>

              <p className="font-black text-slate-800">
                {paidUsers.toLocaleString()} paying users
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ${revenue.toLocaleString()} paid in {periodLabel.toLowerCase()}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}