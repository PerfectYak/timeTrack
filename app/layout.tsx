import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Időkeret – Munkaidő",
  description: "Lokális, fájlalapú munkaidő-nyilvántartó",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
