import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Temporal Service Ops Command Center",
  description:
    "Durable support workflows across Pylon, Salesforce, Slack, and BigQuery, orchestrated by Temporal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
