"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    setAdminKey(localStorage.getItem("adminKey") ?? "");
  }, []);

  function saveKey() {
    localStorage.setItem("adminKey", adminKey);
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-brand-700">
              CallFlow AI
            </Link>
            <Link
              href="/dashboard"
              className={`text-sm font-medium ${pathname === "/dashboard" ? "text-brand-600" : "text-slate-600"}`}
            >
              Clients
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="input max-w-[180px]"
              placeholder="Admin API key"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
            <button type="button" className="btn-secondary" onClick={saveKey}>
              Save
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
