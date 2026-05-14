import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canva AI",
  description: "Production-grade Canva-style editor"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
