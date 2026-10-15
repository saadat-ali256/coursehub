/* AUTO-FORMATTED FOR READABILITY */
/* Page: renders the UI for this route. */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Coupon = {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  value: number;
  usedCount: number;
  usageLimit?: number;
};

type CouponForm = {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  value: number;
  minimumAmount: number;
  perUserLimit: number;
  usageLimit: string;
  startAt: string;
  endAt: string;
  firstTimeOnly: boolean;
  active: boolean;
};

type CouponsResponse = {
  success?: boolean;
  message?: string;
  coupons?: Coupon[];
};

type CouponTextField = "code" | "description" | "usageLimit" | "startAt" | "endAt";

const couponTextFields: {
  key: CouponTextField;
  label: string;
  type: "text" | "date";
}[] = [
  { key: "code", label: "Coupon code", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "usageLimit", label: "Global usage limit", type: "text" },
  { key: "startAt", label: "Start date", type: "date" },
  { key: "endAt", label: "End date", type: "date" },
];

const emptyCouponForm: CouponForm = {
  code: "",
  description: "",
  discountType: "percentage",
  value: 10,
  minimumAmount: 0,
  perUserLimit: 1,
  usageLimit: "",
  startAt: "",
  endAt: "",
  firstTimeOnly: false,
  active: true,
};

export default function Coupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [f, setF] = useState<CouponForm>(emptyCouponForm);
  const [loadError, setLoadError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/coupons");
    const data = (await response.json()) as CouponsResponse;
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Could not load coupons.");
    }
    setRows(data.coupons || []);
    setLoadError("");
  }

  useEffect(() => {
    let active = true;

    async function loadCoupons() {
      const response = await fetch("/api/admin/coupons");
      const data = (await response.json()) as CouponsResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load coupons.");
      }
      if (active) {
        setRows(data.coupons || []);
        setLoadError("");
      }
    }

    void loadCoupons().catch((error: unknown) => {
      if (active) {
        setLoadError(
          error instanceof Error ? error.message : "Could not load coupons.",
        );
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function save() {
    const r = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...f,
        value: Number(f.value),
        usageLimit: f.usageLimit ? Number(f.usageLimit) : undefined,
        minimumAmount: Number(f.minimumAmount),
        perUserLimit: Number(f.perUserLimit),
        startAt: f.startAt || undefined,
        endAt: f.endAt || undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok) return alert(d.message);
    setF({
      ...emptyCouponForm,
    });
    void load().catch((error: unknown) => {
      setLoadError(
        error instanceof Error ? error.message : "Could not load coupons.",
      );
    });
  }

  async function del(id: string) {
    if (confirm("Delete coupon?")) {
      const response = await fetch("/api/admin/coupons?id=" + id, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        return alert(data.message || "Could not delete coupon.");
      }
      void load().catch((error: unknown) => {
        setLoadError(
          error instanceof Error ? error.message : "Could not load coupons.",
        );
      });
    }
  }

  return (
    <main className="admin-workspace min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-bold text-indigo-600">
          ← Admin
        </Link>
        {loadError && (
          <p className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-800" role="alert">
            {loadError}
          </p>
        )}
        <div className="mt-5 grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-black">Advanced Coupons</h1>
            <div className="mt-5 space-y-3">
              {couponTextFields.map(({ key, label, type }) => (
                <input
                  key={key}
                  type={type}
                  value={f[key]}
                  onChange={(e) =>
                    setF({
                      ...f,
                      [key]: e.target.value,
                    })
                  }
                  placeholder={label}
                  className="w-full rounded-xl border px-4 py-3"
                />
              ))}
              <input
                type="number"
                value={f.value}
                onChange={(e) =>
                  setF({ ...f, value: Number(e.target.value) })
                }
                placeholder="Value % / amount"
                className="w-full rounded-xl border px-4 py-3"
              />
              <input
                type="number"
                value={f.minimumAmount}
                onChange={(e) =>
                  setF({ ...f, minimumAmount: Number(e.target.value) })
                }
                placeholder="Minimum amount"
                className="w-full rounded-xl border px-4 py-3"
              />
              <input
                type="number"
                value={f.perUserLimit}
                onChange={(e) =>
                  setF({ ...f, perUserLimit: Number(e.target.value) })
                }
                placeholder="Per-user limit"
                className="w-full rounded-xl border px-4 py-3"
              />
              <select
                value={f.discountType}
                onChange={(e) =>
                  setF({
                    ...f,
                    discountType:
                      e.target.value === "fixed" ? "fixed" : "percentage",
                  })
                }
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
              <label className="flex gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={f.firstTimeOnly}
                  onChange={(e) =>
                    setF({
                      ...f,
                      firstTimeOnly: e.target.checked,
                    })
                  }
                />{" "}
                First-time users only
              </label>
              <label className="flex gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={f.active}
                  onChange={(e) =>
                    setF({
                      ...f,
                      active: e.target.checked,
                    })
                  }
                />{" "}
                Active
              </label>
              <button
                onClick={save}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white"
              >
                Create coupon
              </button>
            </div>
          </section>
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-black">Coupon inventory</h2>
                <p className="text-sm text-slate-500">
                  Usage limits, expiry and status.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                {rows.length} coupons
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {rows.map((c) => (
                <div
                  key={c._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
                >
                  <div>
                    <div className="font-black">{c.code}</div>
                    <div className="text-sm text-slate-500">
                      {c.discountType === "percentage"
                        ? `${c.value}%`
                        : `$${c.value}`}{" "}
                      · used {c.usedCount}
                      {c.usageLimit ? `/${c.usageLimit}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => del(c._id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {!rows.length && (
                <div className="py-10 text-center text-slate-500">
                  No coupons yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
