/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CourseHubLogo from "@/components/CourseHubLogo";

type PremiumPlan = {
  name: string;
  slug: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
};

type PremiumPlansResponse = {
  success?: boolean;
  message?: string;
  plans?: PremiumPlan[];
};

const defaults: PremiumPlan[] = [
  {
    name: "Premium Monthly",
    slug: "monthly",
    price: 19,
    interval: "month",
    description: "Full access to premium learning.",
    features: [
      "All premium courses",
      "Full video playlists",
      "Quizzes & certificates",
      "Private community",
      "Study resources",
    ],
  },
  {
    name: "Premium Yearly",
    slug: "yearly",
    price: 149,
    interval: "year",
    description: "Best value for serious learners.",
    features: [
      "Everything in Monthly",
      "Priority community",
      "Annual savings",
      "All future premium courses",
      "Premium events",
    ],
  },
];
export default function Premium() {
  const [plans, setPlans] = useState<PremiumPlan[]>(defaults);
  useEffect(() => {
    let active = true;

    async function loadPlans() {
      const response = await fetch("/api/premium/plans");
      const data = (await response.json()) as PremiumPlansResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load premium plans.");
      }
      if (active && data.plans?.length) setPlans(data.plans);
    }

    void loadPlans().catch((error: unknown) => {
      console.error("Could not load premium plans.", error);
    });

    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="coursehub-page min-h-screen bg-[#f7f8fc]">
      <nav className="glass sticky top-0 z-50">
        <div className="container site-navbar-inner flex items-center justify-between py-4">
          <Link href="/" className="navbar-wordmark text-2xl font-black">
            <CourseHubLogo size="sm" />
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            Dashboard
          </Link>
        </div>
      </nav>
      <section className="container py-20 text-center">
        <p className="text-sm font-black uppercase tracking-[.2em] text-indigo-600">
          Premium
        </p>
        <h1 className="mt-3 text-5xl font-black">Choose your learning plan.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-500">
          Unlock the complete CourseHub experience: premium courses, community,
          quizzes, certificates and resources.
        </p>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div key={p.slug} className="card p-8 text-left">
              <div className="text-xl font-black">{p.name}</div>
              <p className="mt-2 text-sm text-slate-500">{p.description}</p>
              <div className="mt-6 text-5xl font-black">
                ${p.price}
                <span className="text-base font-medium text-slate-500">
                  /{p.interval}
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f: string) => (
                  <li key={f} className="text-sm font-semibold">
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/subscriptions"
                className="mt-8 block rounded-2xl bg-indigo-600 px-5 py-3 text-center font-bold text-white"
              >
                Choose plan
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
