const API_BASE =
  typeof window === "undefined"
    ? process.env.API_URL ?? "http://localhost:3001"
    : "/api-backend";

function adminHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const key = localStorage.getItem("adminKey") ?? "";
  return {
    "Content-Type": "application/json",
    ...(key ? { "x-admin-key": key } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...adminHeaders(), ...init?.headers },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new Error(`API failed to respond (${detail})`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; tenantCount: number }>("/health"),

  listTenants: () => request<{ tenants: import("./types").TenantSummary[]; count: number }>("/admin/tenants"),

  getTenant: (slug: string) => request<{ tenant: import("./types").TenantDetail }>(`/admin/tenants/${slug}`),

  createTenant: (body: Record<string, unknown>) =>
    request<{ tenant: import("./types").TenantDetail }>("/admin/tenants", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTenant: (slug: string, body: Record<string, unknown>) =>
    request<{ tenant: import("./types").TenantDetail }>(`/admin/tenants/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTenant: (slug: string) =>
    request<void>(`/admin/tenants/${slug}`, { method: "DELETE" }),

  getBookings: (slug: string) =>
    request<{ stats: { total: number; upcoming: number; completed: number }; bookings: import("./types").Booking[] }>(
      `/admin/tenants/${slug}/bookings`,
    ),

  getOnboarding: (slug: string) =>
    request<import("./types").Onboarding>(`/admin/tenants/${slug}/onboarding`),

  getPrompt: (slug: string) =>
    request<{ systemPrompt: string }>(`/admin/tenants/${slug}/prompt`),
};
