import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwarmOracle - Collective Intelligence Q&A",
  description: "Ask anything. Get answers from the swarm. Multiple AI agents debate, critique, and reach consensus.",
  keywords: ["AI", "agents", "collective intelligence", "Q&A", "consensus", "swarm"],
  openGraph: {
    title: "SwarmOracle - Collective Intelligence Q&A",
    description: "Ask anything. Get answers from the swarm.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
