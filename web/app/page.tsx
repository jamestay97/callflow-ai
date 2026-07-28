import Link from "next/link";

const features = [
  {
    title: "Intent-matching AI",
    desc: "Understands why callers are reaching out and routes them to the right service — emergency, maintenance, or standard visit.",
  },
  {
    title: "Smart scheduling",
    desc: "Checks real-time calendar availability and books appointments while the caller is still on the line.",
  },
  {
    title: "Secure payments",
    desc: "Texts Stripe payment links after booking. Card numbers are never spoken or stored by the AI.",
  },
  {
    title: "24/7 coverage",
    desc: "Never miss another after-hours call. Every caller gets a professional response and a clear next step.",
  },
];

const steps = [
  "Caller dials your business number",
  "AI matches their reason to the right service",
  "Appointment booked on your calendar",
  "Payment link texted if needed",
  "You get a summary email after the call",
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-brand-700">CallFlow AI</div>
          <nav className="flex gap-4 text-sm font-medium">
            <a href="#features" className="text-slate-600 hover:text-brand-600">
              Features
            </a>
            <a href="#how" className="text-slate-600 hover:text-brand-600">
              How it works
            </a>
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-brand-50 to-white px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-600">
            AI Receptionist for Local Businesses
          </p>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Never miss a booking call again
          </h1>
          <p className="mb-8 text-lg text-slate-600">
            CallFlow AI answers your phone, understands why customers are calling, books
            appointments on your calendar, and collects payments — fully automated.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
              Open Dashboard
            </Link>
            <a href="#how" className="btn-secondary px-6 py-3 text-base">
              See how it works
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">Built for service businesses</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="card">
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-slate-100 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold">How it works</h2>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={step} className="flex items-start gap-4 card">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="mb-4 text-3xl font-bold">Ready to automate bookings?</h2>
        <p className="mb-8 text-slate-600">
          Manage all your business clients from one dashboard. Each gets their own AI
          receptionist, calendar, and payment setup.
        </p>
        <Link href="/dashboard" className="btn-primary px-8 py-3 text-base">
          Get started in the dashboard
        </Link>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        CallFlow AI — Automated client booking for local businesses
      </footer>
    </div>
  );
}
