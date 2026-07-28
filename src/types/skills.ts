export interface ReceptionistSkill {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  serviceId: string;
  priority: "normal" | "urgent";
  suggestPayment: boolean;
}

export const defaultSkills: ReceptionistSkill[] = [
  {
    id: "emergency-repair",
    name: "Emergency Repair",
    description: "Urgent issues like leaks, flooding, no heat/AC, or safety hazards.",
    keywords: ["emergency", "urgent", "leak", "flooding", "flood", "no heat", "no ac", "burst", "gas smell"],
    serviceId: "emergency",
    priority: "urgent",
    suggestPayment: true,
  },
  {
    id: "standard-service",
    name: "Standard Service Call",
    description: "General repairs, diagnostics, and one-time fixes.",
    keywords: ["repair", "fix", "broken", "not working", "issue", "problem", "service call"],
    serviceId: "service-call",
    priority: "normal",
    suggestPayment: true,
  },
  {
    id: "maintenance",
    name: "Maintenance Visit",
    description: "Preventive maintenance, tune-ups, and seasonal checkups.",
    keywords: ["maintenance", "tune-up", "checkup", "inspection", "annual", "preventive", "service plan"],
    serviceId: "maintenance",
    priority: "normal",
    suggestPayment: false,
  },
];

export interface BookingRecord {
  id: string;
  tenantSlug: string;
  tenantId: string;
  calcomUid?: string;
  attendeeName: string;
  attendeePhone: string;
  attendeeEmail?: string;
  startTime: string;
  endTime?: string;
  serviceId?: string;
  serviceName?: string;
  skillId?: string;
  skillName?: string;
  callerReason?: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
  source: "ai-receptionist" | "manual";
  createdAt: string;
}

export interface IntentMatchResult {
  matched: boolean;
  skill?: ReceptionistSkill;
  serviceId?: string;
  serviceName?: string;
  priority: "normal" | "urgent";
  suggestPayment: boolean;
  confidence: "high" | "medium" | "low";
}
