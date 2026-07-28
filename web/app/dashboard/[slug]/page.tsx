"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { TenantDetail } from "@/lib/types";

export default function TenantPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [integrations, setIntegrations] = useState({
    calcomApiKey: "",
    calcomEventTypeId: "",
    stripeSecretKey: "",
    makeWebhookUrl: "",
    vapiWebhookSecret: "",
  });

  useEffect(() => {
    api
      .getTenant(slug)
      .then((d) => setTenant(d.tenant))
      .catch((e) => setError(e.message));
  }, [slug]);

  async function saveIntegrations() {
    try {
      const body: Record<string, unknown> = {
        integrations: {
          calcomApiKey: integrations.calcomApiKey || undefined,
          calcomEventTypeId: integrations.calcomEventTypeId
            ? Number(integrations.calcomEventTypeId)
            : undefined,
          stripeSecretKey: integrations.stripeSecretKey || undefined,
          makeWebhookUrl: integrations.makeWebhookUrl || undefined,
          vapiWebhookSecret: integrations.vapiWebhookSecret || undefined,
        },
      };
      const { tenant: updated } = await api.updateTenant(slug, body);
      setTenant(updated);
      setSaved(true);
      setShowIntegrations(false);
      setIntegrations({
        calcomApiKey: "",
        calcomEventTypeId: "",
        stripeSecretKey: "",
        makeWebhookUrl: "",
        vapiWebhookSecret: "",
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (error && !tenant) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!tenant) {
    return <div className="text-slate-500">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← All clients
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{tenant.displayName}</h1>
        <p className="text-slate-600">
          {tenant.businessPhone} · {tenant.timezone}
        </p>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {saved && <div className="mb-4 text-emerald-600">Integrations updated.</div>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Services</h2>
          <ul className="space-y-3">
            {tenant.services.map((s) => (
              <li key={s.id} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-slate-500">
                  ${s.priceUsd} · {s.durationMinutes}min
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Integrations</h2>
            <button
              type="button"
              className="text-sm text-brand-600 hover:underline"
              onClick={() => setShowIntegrations(!showIntegrations)}
            >
              {showIntegrations ? "Cancel" : "Configure"}
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            <li>Calendar: {tenant.integrations.hasCalcomApiKey ? "✅ Connected" : "❌ Not set"}</li>
            <li>Stripe: {tenant.integrations.hasStripeSecretKey ? "✅ Connected" : "❌ Not set"}</li>
            <li>Make.com: {tenant.integrations.hasMakeWebhookUrl ? "✅ Connected" : "❌ Not set"}</li>
            <li>
              Webhook secret:{" "}
              {tenant.integrations.hasVapiWebhookSecret ? "✅ Set" : "⚠️ Optional"}
            </li>
          </ul>
          {showIntegrations && (
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500">
                Leave blank to keep existing values. Keys are never shown after saving.
              </p>
              <input
                className="input"
                placeholder="Cal.com API key"
                type="password"
                value={integrations.calcomApiKey}
                onChange={(e) =>
                  setIntegrations({ ...integrations, calcomApiKey: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Cal.com event type ID"
                value={integrations.calcomEventTypeId}
                onChange={(e) =>
                  setIntegrations({ ...integrations, calcomEventTypeId: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Stripe secret key"
                type="password"
                value={integrations.stripeSecretKey}
                onChange={(e) =>
                  setIntegrations({ ...integrations, stripeSecretKey: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Make.com webhook URL"
                value={integrations.makeWebhookUrl}
                onChange={(e) =>
                  setIntegrations({ ...integrations, makeWebhookUrl: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Vapi webhook secret"
                type="password"
                value={integrations.vapiWebhookSecret}
                onChange={(e) =>
                  setIntegrations({ ...integrations, vapiWebhookSecret: e.target.value })
                }
              />
              <button type="button" className="btn-primary" onClick={saveIntegrations}>
                Save integrations
              </button>
            </div>
          )}
        </div>

        <div className="card md:col-span-2">
          <h2 className="mb-4 font-semibold">AI Skills ({tenant.skills?.length ?? 0})</h2>
          <p className="mb-4 text-sm text-slate-600">
            Skills match caller reasons to the right service.{" "}
            <Link href={`/dashboard/${slug}/skills`} className="text-brand-600 hover:underline">
              Edit skills →
            </Link>
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {(tenant.skills ?? []).map((skill) => (
              <div key={skill.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{skill.name}</div>
                <div className="text-slate-500">
                  {skill.priority === "urgent" ? "🚨 Urgent" : "Normal"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card md:col-span-2">
          <h2 className="mb-2 font-semibold">Quick links</h2>
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/${slug}/setup`} className="btn-secondary">
              Vapi setup →
            </Link>
            <Link href={`/dashboard/${slug}/bookings`} className="btn-secondary">
              View bookings →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
