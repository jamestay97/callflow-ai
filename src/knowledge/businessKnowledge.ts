/**
 * Static business knowledge injected into the AI system prompt.
 * Replace or extend per tenant; later this can load from a database.
 */
export interface BusinessKnowledge {
  name: string;
  phone: string;
  timezone: string;
  website?: string;
  hours: Record<string, string>;
  services: Array<{
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    priceUsd: number;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  policies: string[];
}

export const defaultBusinessKnowledge: BusinessKnowledge = {
  name: "Acme Home Services",
  phone: "+1 (555) 123-4567",
  timezone: "America/New_York",
  website: "https://example.com",
  hours: {
    Monday: "8:00 AM – 6:00 PM",
    Tuesday: "8:00 AM – 6:00 PM",
    Wednesday: "8:00 AM – 6:00 PM",
    Thursday: "8:00 AM – 6:00 PM",
    Friday: "8:00 AM – 6:00 PM",
    Saturday: "9:00 AM – 2:00 PM",
    Sunday: "Closed",
  },
  services: [
    {
      id: "service-call",
      name: "Standard Service Call",
      description: "Diagnosis and repair for common residential issues.",
      durationMinutes: 60,
      priceUsd: 89,
    },
    {
      id: "maintenance",
      name: "Maintenance Visit",
      description: "Preventive maintenance and system check.",
      durationMinutes: 45,
      priceUsd: 69,
    },
    {
      id: "emergency",
      name: "Emergency Visit",
      description: "Same-day urgent service (subject to availability).",
      durationMinutes: 90,
      priceUsd: 149,
    },
  ],
  faqs: [
    {
      question: "What areas do you serve?",
      answer: "We serve the greater metro area within a 25-mile radius of downtown.",
    },
    {
      question: "Do you offer free estimates?",
      answer: "Yes. Estimates are free for standard residential jobs booked during business hours.",
    },
    {
      question: "What is your cancellation policy?",
      answer: "Please cancel or reschedule at least 24 hours in advance to avoid a fee.",
    },
    {
      question: "Do you accept credit cards?",
      answer:
        "Yes. We never collect card numbers over the phone. After your visit is scheduled, we can text you a secure Stripe payment link.",
    },
  ],
  policies: [
    "Never ask for or accept credit card numbers, CVV, or full payment details over the phone.",
    "For payments, use the send_payment_link tool to text a secure link to the caller's mobile number.",
    "Confirm the caller's name and callback number before booking.",
    "If the caller describes an emergency (gas leak, flooding, no heat in freezing weather), offer to transfer to a human or take urgent details for immediate callback.",
  ],
};

export function formatKnowledgeForPrompt(knowledge: BusinessKnowledge): string {
  const hoursBlock = Object.entries(knowledge.hours)
    .map(([day, hours]) => `- ${day}: ${hours}`)
    .join("\n");

  const servicesBlock = knowledge.services
    .map(
      (s) =>
        `- ${s.name} (${s.durationMinutes} min, $${s.priceUsd}): ${s.description} [id: ${s.id}]`,
    )
    .join("\n");

  const faqsBlock = knowledge.faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const policiesBlock = knowledge.policies.map((p) => `- ${p}`).join("\n");

  return `
## Business profile
- Name: ${knowledge.name}
- Phone: ${knowledge.phone}
- Timezone: ${knowledge.timezone}
${knowledge.website ? `- Website: ${knowledge.website}` : ""}

## Hours of operation
${hoursBlock}

## Services offered
${servicesBlock}

## Frequently asked questions
${faqsBlock}

## Policies (must follow)
${policiesBlock}
`.trim();
}
