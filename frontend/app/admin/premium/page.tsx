/* Page: manages premium subscription plans using the existing admin API. */
"use client";

import { useCallback, useEffect, useState } from "react";
import CourseHubLoader, { CSpinner } from "@/components/CourseHubLoader";

type Plan = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  interval: "month" | "year";
  description: string;
  features: string[];
  active: boolean;
};

type PlanForm = {
  name: string;
  slug: string;
  price: string;
  interval: "month" | "year";
  description: string;
  features: string;
};

const emptyForm: PlanForm = {
  name: "",
  slug: "",
  price: "",
  interval: "month",
  description: "",
  features: "",
};

export default function AdminPremium() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/premium", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        plans?: Plan[];
        message?: string;
      };
      if (response.status === 403) {
        setAccessDenied(true);
        throw new Error(data.message || "Admin access required.");
      }
      if (!response.ok)
        throw new Error(data.message || "Could not load premium plans.");
      setAccessDenied(false);
      setPlans(data.plans || []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load premium plans.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInitialPlans() {
      try {
        const response = await fetch("/api/admin/premium", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          plans?: Plan[];
          message?: string;
        };
        if (response.status === 403) {
          if (active) setAccessDenied(true);
          throw new Error(data.message || "Admin access required.");
        }
        if (!response.ok)
          throw new Error(data.message || "Could not load premium plans.");
        if (active) {
          setAccessDenied(false);
          setPlans(data.plans || []);
        }
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load premium plans.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitialPlans();
    return () => {
      active = false;
    };
  }, []);

  function editPlan(plan: Plan) {
    setEditingId(plan._id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: String(plan.price),
      interval: plan.interval,
      description: plan.description || "",
      features: (plan.features || []).join("\n"),
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/premium", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          ...form,
          price: Number(form.price),
          features: form.features
            .split("\n")
            .map((feature) => feature.trim())
            .filter(Boolean),
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          data.message ||
            `Could not ${editingId ? "update" : "create"} premium plan.`,
        );

      setForm(emptyForm);
      setEditingId(null);
      setNotice(editingId ? "Plan updated." : "Plan created.");
      await loadPlans();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Could not ${editingId ? "update" : "create"} premium plan.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(plan: Plan) {
    if (
      !window.confirm(
        `Delete the "${plan.name}" plan? Existing subscriptions and payments may refer to this plan.`,
      )
    )
      return;

    setDeletingId(plan._id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/premium?id=${encodeURIComponent(plan._id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message || "Could not delete premium plan.");

      if (editingId === plan._id) cancelEdit();
      setNotice("Plan deleted.");
      await loadPlans();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete premium plan.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function updateField<Key extends keyof PlanForm>(
    key: Key,
    value: PlanForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="admin-workspace min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Premium Plans
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Create and manage the subscription plans offered to learners.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadPlans()}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
          >
            {loading ? <><CSpinner className="coursehub-loader__mark--small" /> Refreshing...</> : "Refresh plans"}
          </button>
        </header>

        {error && !accessDenied && (
          <div
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            role="status"
          >
            {notice}
          </div>
        )}

        {accessDenied ? (
          <section className="card mt-6 p-6" role="status">
            <h2 className="text-lg font-bold text-slate-900">
              Administrator access required
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Sign in with an administrator account to manage premium plans.
            </p>
            <a
              href="/login?next=%2Fadmin%2Fpremium"
              className="mt-4 inline-flex rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-800"
            >
              Sign in
            </a>
          </section>
        ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
          <form onSubmit={save} className="card space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingId ? "Edit plan" : "Create a plan"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingId
                  ? "Update the selected plan details."
                  : "Add a monthly or yearly subscription option."}
              </p>
            </div>
            <div>
              <label
                htmlFor="premium-plan-name"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Plan name
              </label>
              <input
                id="premium-plan-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                autoComplete="off"
                required
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>
            <div>
              <label
                htmlFor="premium-plan-slug"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Slug
              </label>
              <input
                id="premium-plan-slug"
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                autoComplete="off"
                required
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="premium-plan-price"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Price
                </label>
                <input
                  id="premium-plan-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  required
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>
              <div>
                <label
                  htmlFor="premium-plan-interval"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Billing interval
                </label>
                <select
                  id="premium-plan-interval"
                  value={form.interval}
                  onChange={(event) =>
                    updateField("interval", event.target.value as PlanForm["interval"])
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="premium-plan-description"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Description
              </label>
              <textarea
                id="premium-plan-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={3}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>
            <div>
              <label
                htmlFor="premium-plan-features"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Features <span className="font-normal text-slate-500">(one per line)</span>
              </label>
              <textarea
                id="premium-plan-features"
                value={form.features}
                onChange={(event) => updateField("features", event.target.value)}
                rows={5}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || deletingId !== null}
                className="min-w-36 flex-1 rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create plan"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <section aria-labelledby="premium-plan-list-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="premium-plan-list-heading"
                  className="text-lg font-extrabold text-slate-900"
                >
                  Available plans
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {plans.length} {plans.length === 1 ? "plan" : "plans"}
                </p>
              </div>
            </div>
            {loading ? (
              <CourseHubLoader label="Loading premium plans..." className="card" />
            ) : plans.length === 0 ? (
              <div className="card p-8 text-center">
                <h3 className="font-bold text-slate-900">No plans yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create a plan using the form to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <article className="card p-5" key={plan._id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-lg font-extrabold text-slate-900">
                            {plan.name}
                          </h3>
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold capitalize text-indigo-800">
                            {plan.interval}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {plan.slug}
                        </p>
                      </div>
                      <p className="shrink-0 text-xl font-black text-slate-900">
                        ${plan.price}
                        <span className="text-sm font-semibold text-slate-500">
                          /{plan.interval}
                        </span>
                      </p>
                    </div>
                    {plan.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {plan.description}
                      </p>
                    )}
                    {plan.features?.length > 0 && (
                      <ul className="mt-3 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">
                        {plan.features.map((feature, index) => (
                          <li className="break-words" key={`${index}-${feature}`}>
                            <span
                              aria-hidden="true"
                              className="mr-2 font-bold text-emerald-700"
                            >
                              ✓
                            </span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => editPlan(plan)}
                        disabled={saving || deletingId !== null}
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePlan(plan)}
                        disabled={saving || deletingId !== null}
                        className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === plan._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        )}
      </div>
    </main>
  );
}
