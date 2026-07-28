import type { ReceptionistSkill, IntentMatchResult } from "../types/skills.js";
import type { TenantRecord } from "../types/tenant.js";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ");
}

export function matchCallIntent(
  tenant: TenantRecord,
  callerReason: string,
): IntentMatchResult & { message: string } {
  const reason = normalize(callerReason);
  const skills = tenant.skills ?? [];
  const words = reason.split(/\s+/).filter(Boolean);

  let best: { skill: ReceptionistSkill; score: number } | null = null;

  for (const skill of skills) {
    let score = 0;
    for (const keyword of skill.keywords) {
      const kw = normalize(keyword);
      if (reason.includes(kw)) {
        score += kw.split(/\s+/).length >= 2 ? 3 : 2;
      }
      for (const word of words) {
        if (word === kw || word.startsWith(kw) || kw.startsWith(word)) {
          score += 1;
        }
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { skill, score };
    }
  }

  if (!best) {
    const fallback = tenant.services[0];
    return {
      matched: false,
      priority: "normal",
      suggestPayment: false,
      confidence: "low",
      serviceId: fallback?.id,
      serviceName: fallback?.name,
      message: fallback
        ? `Based on what you described, I'd recommend our ${fallback.name}. Would you like to schedule an appointment?`
        : "I can help you schedule an appointment. What day works best for you?",
    };
  }

  const service = tenant.services.find((s) => s.id === best!.skill.serviceId);
  const confidence: IntentMatchResult["confidence"] =
    best.score >= 4 ? "high" : best.score >= 2 ? "medium" : "low";

  const urgentNote =
    best.skill.priority === "urgent"
      ? " This sounds urgent — I'll prioritize getting you scheduled as soon as possible."
      : "";

  const paymentNote =
    best.skill.suggestPayment && service
      ? ` The ${service.name} is $${service.priceUsd}. I can text you a secure payment link after we book — we never take card numbers over the phone.`
      : "";

  return {
    matched: true,
    skill: best.skill,
    serviceId: best.skill.serviceId,
    serviceName: service?.name ?? best.skill.name,
    priority: best.skill.priority,
    suggestPayment: best.skill.suggestPayment,
    confidence,
    message: `It sounds like you need ${best.skill.name}${service ? ` — our ${service.name}` : ""}.${urgentNote}${paymentNote} Shall I check availability for you?`,
  };
}

export function formatSkillsForPrompt(skills: ReceptionistSkill[]): string {
  if (skills.length === 0) {
    return "No custom skills configured.";
  }

  return skills
    .map(
      (s) =>
        `- **${s.name}** (id: ${s.id}, service: ${s.serviceId}, priority: ${s.priority}): ${s.description}. Keywords: ${s.keywords.join(", ")}`,
    )
    .join("\n");
}
