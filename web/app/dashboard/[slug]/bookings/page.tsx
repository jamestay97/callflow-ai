"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Booking } from "@/lib/types";

export default function BookingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0 });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getBookings(slug)
      .then((d) => {
        setStats(d.stats);
        setBookings(d.bookings);
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  return (
    <div>
      <Link href={`/dashboard/${slug}`} className="text-sm text-brand-600 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-2 mb-8 text-2xl font-bold">Bookings</h1>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="card text-center">
          <div className="text-3xl font-bold text-brand-600">{stats.total}</div>
          <div className="text-sm text-slate-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-600">{stats.upcoming}</div>
          <div className="text-sm text-slate-500">Upcoming</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-slate-600">{stats.completed}</div>
          <div className="text-sm text-slate-500">Completed</div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card text-center text-slate-600">
          No bookings yet. They appear here when the AI books appointments.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">When</th>
                <th className="pb-3 pr-4">Service</th>
                <th className="pb-3 pr-4">Reason</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{b.attendeeName}</div>
                    <div className="text-slate-500">{b.attendeePhone}</div>
                  </td>
                  <td className="py-3 pr-4">{new Date(b.startTime).toLocaleString()}</td>
                  <td className="py-3 pr-4">{b.serviceName ?? "—"}</td>
                  <td className="py-3 pr-4 max-w-xs truncate">{b.callerReason ?? b.skillName ?? "—"}</td>
                  <td className="py-3">
                    <span className={b.status === "scheduled" || b.status === "confirmed" ? "badge-green" : "badge-yellow"}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
