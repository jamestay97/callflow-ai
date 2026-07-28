"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Onboarding } from "@/lib/types";

export default function SetupPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getOnboarding(slug)
      .then(setOnboarding)
      .catch((e) => setError(e.message));
  }, [slug]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!onboarding) {
    return <div className="text-slate-500">Loading setup...</div>;
  }

  const { vapi, checklist } = onboarding;
  const isLocalhostUrl = vapi.serverUrl.includes("localhost") || vapi.serverUrl.startsWith("http://127.0.0.1");

  return (
    <div>
      <Link href={`/dashboard/${slug}`} className="text-sm text-brand-600 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-bold">Vapi Setup</h1>
      <p className="mb-8 text-slate-600">
        Copy these into your Vapi assistant to connect the AI receptionist.
      </p>

      {isLocalhostUrl && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Vapi cannot use localhost.</strong> Start ngrok (<code>ngrok http 3001</code>), add{" "}
          <code>PUBLIC_BASE_URL=https://your-url.ngrok-free.app</code> to <code>.env</code>, restart{" "}
          <code>npm run dev:all</code>, then refresh this page and copy the new Server URL.
        </div>
      )}

      <div className="mb-8 card">
        <h2 className="mb-4 font-semibold">Setup checklist</h2>
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.step} className="flex items-center gap-3 text-sm">
              <span>{item.done ? "✅" : "⬜"}</span>
              <span className={item.done ? "text-slate-600" : "font-medium"}>
                {item.task}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <SetupBlock
        title="Server URL (webhook)"
        value={vapi.serverUrl}
        copied={copied}
        label="url"
        onCopy={copy}
      />

      <SetupBlock
        title="System prompt"
        value={vapi.systemPrompt}
        copied={copied}
        label="prompt"
        onCopy={copy}
        multiline
      />

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Tool schemas (JSON)</h2>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => copy(JSON.stringify(vapi.tools, null, 2), "tools")}
          >
            {copied === "tools" ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(vapi.tools, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function SetupBlock({
  title,
  value,
  copied,
  label,
  onCopy,
  multiline,
}: {
  title: string;
  value: string;
  copied: string;
  label: string;
  onCopy: (text: string, label: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="card mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" className="btn-secondary text-xs" onClick={() => onCopy(value, label)}>
          {copied === label ? "Copied!" : "Copy"}
        </button>
      </div>
      {multiline ? (
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-100 p-4 text-xs whitespace-pre-wrap">
          {value}
        </pre>
      ) : (
        <code className="block rounded-lg bg-slate-100 p-3 text-sm break-all">{value}</code>
      )}
    </div>
  );
}
