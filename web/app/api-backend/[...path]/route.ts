import { NextRequest, NextResponse } from "next/server";

function apiOrigin(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:3001";
  return raw.replace(/\/$/, "");
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const target = `${apiOrigin()}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey) headers.set("x-admin-key", adminKey);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  try {
    const res = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    return NextResponse.json(
      { error: `API failed to respond (${detail})` },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const PUT = proxy;
