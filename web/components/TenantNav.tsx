"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

export function TenantNav() {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const tabs = [
    { href: `/dashboard/${slug}`, label: "Overview", exact: true },
    { href: `/dashboard/${slug}/skills`, label: "AI Skills" },
    { href: `/dashboard/${slug}/bookings`, label: "Bookings" },
    { href: `/dashboard/${slug}/setup`, label: "Vapi Setup" },
  ];

  return (
    <nav className="mb-8 flex gap-2 border-b border-slate-200">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-600 hover:text-brand-600"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
