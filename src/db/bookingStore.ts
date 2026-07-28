import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import type { BookingRecord } from "../types/skills.js";

interface BookingStoreFile {
  version: 1;
  bookings: BookingRecord[];
}

function storePath(): string {
  return env.BOOKINGS_DATA_PATH;
}

function ensureDataDir(): void {
  const dir = dirname(storePath());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readStore(): BookingStoreFile {
  ensureDataDir();
  if (!existsSync(storePath())) {
    return { version: 1, bookings: [] };
  }
  const raw = readFileSync(storePath(), "utf-8");
  const parsed = JSON.parse(raw) as BookingStoreFile;
  return parsed.bookings ? parsed : { version: 1, bookings: [] };
}

function writeStore(store: BookingStoreFile): void {
  ensureDataDir();
  const tmp = `${storePath()}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf-8");
  renameSync(tmp, storePath());
}

export function listBookings(tenantSlug?: string): BookingRecord[] {
  const bookings = readStore().bookings;
  const filtered = tenantSlug
    ? bookings.filter((b) => b.tenantSlug === tenantSlug)
    : bookings;
  return filtered.sort((a, b) => b.startTime.localeCompare(a.startTime));
}

export function createBooking(
  input: Omit<BookingRecord, "id" | "createdAt" | "status" | "source"> & {
    status?: BookingRecord["status"];
    source?: BookingRecord["source"];
  },
): BookingRecord {
  const store = readStore();
  const booking: BookingRecord = {
    id: randomUUID(),
    status: input.status ?? "scheduled",
    source: input.source ?? "ai-receptionist",
    createdAt: new Date().toISOString(),
    ...input,
  };
  store.bookings.push(booking);
  writeStore(store);
  return booking;
}

export function bookingStats(tenantSlug: string) {
  const bookings = listBookings(tenantSlug);
  const now = new Date().toISOString();
  return {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.status === "scheduled" && b.startTime >= now).length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };
}
