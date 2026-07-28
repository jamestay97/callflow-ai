"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { TenantSummary } from "@/lib/types";

export default function DashboardPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ displayName: "", businessPhone: "", slug: "" });

  useEffect(() => {
    api
      .listTenants()
      .then((d) => setTenants(d.tenants))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { tenant } = await api.createTenant({
        displayName: form.displayName,
        businessPhone: form.businessPhone,
        slug: form.slug || undefined,
      });
      setTenants((t) => [...t, tenant]);
      setShowForm(false);
      setForm({ displayName: "", businessPhone: "", slug: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business clients</h1>
          <p className="text-slate-600">Manage AI receptionists for each local business</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          + Add client
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}. Make sure the API is running (port 3001).
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-8 grid gap-4 md:grid-cols-3">
          <input
            className="input"
            placeholder="Business name *"
            required
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <input
            className="input"
            placeholder="Phone +15551234567 *"
            required
            value={form.businessPhone}
            onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
          />
          <input
            className="input"
            placeholder="Slug (optional)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <div className="md:col-span-3">
            <button type="submit" className="btn-primary">
              Create client
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading clients...</p>
      ) : tenants.length === 0 ? (
        <div className="card text-center text-slate-600">
          No clients yet. Add your first business above.
        </div>
      ) : (
        <div className="grid gap-4">
          {tenants.map((t) => (
            <Link
              key={t.slug}
              href={`/dashboard/${t.slug}`}
              className="card flex items-center justify-between transition hover:border-brand-300 hover:shadow-md"
            >
              <div>
                <h2 className="text-lg font-semibold">{t.displayName}</h2>
                <p className="text-sm text-slate-500">
                  {t.slug} · {t.businessPhone}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    t.status === "active"
                      ? "badge-green"
                      : t.status === "trial"
                        ? "badge-yellow"
                        : "badge-red"
                  }
                >
                  {t.status}
                </span>
                <IntegrationDots configured={t.integrationsConfigured} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationDots({
  configured,
}: {
  configured: TenantSummary["integrationsConfigured"];
}) {
  const items = [
    { ok: configured.calcom, label: "Calendar" },
    { ok: configured.stripe, label: "Stripe" },
    { ok: configured.make, label: "Make" },
  ];
  return (
    <div className="flex gap-1" title={items.map((i) => `${i.label}: ${i.ok ? "✓" : "✗"}`).join(", ")}>
      {items.map((i) => (
        <span
          key={i.label}
          className={`h-2.5 w-2.5 rounded-full ${i.ok ? "bg-emerald-500" : "bg-slate-300"}`}
        />
      ))}
    </div>
  );
}
