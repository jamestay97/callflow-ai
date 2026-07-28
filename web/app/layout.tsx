import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CallFlow AI — Automated Booking Receptionist",
  description:
    "AI phone receptionist that matches caller intent, books appointments, and sends secure payment links for local service businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
