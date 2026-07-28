"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Skill, TenantDetail } from "@/lib/types";

export default function SkillsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getTenant(slug)
      .then((d) => {
        setTenant(d.tenant);
        setSkills(d.tenant.skills ?? []);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  function updateSkill(index: number, patch: Partial<Skill>) {
    setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setSaved(false);
  }

  function addSkill() {
    const id = `skill-${Date.now()}`;
    const defaultServiceId = tenant?.services[0]?.id ?? "service-call";
    setSkills((prev) => [
      ...prev,
      {
        id,
        name: "New skill",
        description: "",
        keywords: [],
        serviceId: defaultServiceId,
        priority: "normal",
        suggestPayment: true,
      },
    ]);
    setSaved(false);
  }

  function removeSkill(index: number) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function handleSave() {
    try {
      const { tenant: updated } = await api.updateTenant(slug, { skills });
      setTenant(updated);
      setSkills(updated.skills ?? []);
      setSaved(true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (!tenant) {
    return <div className="text-slate-500">Loading...</div>;
  }

  return (
    <div>
      <Link href={`/dashboard/${slug}`} className="text-sm text-brand-600 hover:underline">
        ← {tenant.displayName}
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-bold">AI Skills</h1>
      <p className="mb-8 text-slate-600">
        When a caller explains their reason, the AI uses these skills to match intent and recommend
        the right service before booking.
      </p>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {saved && <div className="mb-4 text-emerald-600">Skills saved.</div>}

      <div className="space-y-6">
        {skills.map((skill, i) => (
          <div key={skill.id} className="card space-y-4">
            <div className="flex justify-between">
              <input
                className="input max-w-md font-semibold"
                value={skill.name}
                onChange={(e) => updateSkill(i, { name: e.target.value })}
              />
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() => removeSkill(i)}
              >
                Remove
              </button>
            </div>
            <textarea
              className="input"
              rows={2}
              placeholder="Description for the AI"
              value={skill.description}
              onChange={(e) => updateSkill(i, { description: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">Keywords (comma-separated)</label>
              <input
                className="input"
                value={skill.keywords.join(", ")}
                onChange={(e) =>
                  updateSkill(i, {
                    keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                  })
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Maps to service</label>
                <select
                  className="input"
                  value={skill.serviceId}
                  onChange={(e) => updateSkill(i, { serviceId: e.target.value })}
                >
                  {tenant.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Priority</label>
                <select
                  className="input"
                  value={skill.priority}
                  onChange={(e) =>
                    updateSkill(i, { priority: e.target.value as "normal" | "urgent" })
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skill.suggestPayment}
                    onChange={(e) => updateSkill(i, { suggestPayment: e.target.checked })}
                  />
                  Suggest payment after booking
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button type="button" className="btn-secondary" onClick={addSkill}>
          + Add skill
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save skills
        </button>
      </div>
    </div>
  );
}
