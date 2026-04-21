import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CounselConnect",
  description: "Book and manage counseling sessions at your school.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
