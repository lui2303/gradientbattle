import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "./components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gradient Battle",
  description: "Tune gradient descent optimizers and race them to the minimum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `dark` activates the `dark:` variants shadcn components ship with; the
    // palette itself lives on :root in globals.css.
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script
          id="mathjax"
          src="https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js?config=TeX-MML-AM_CHTML"
          strategy="beforeInteractive"
        />
        <TooltipProvider delayDuration={200}>
          <SiteHeader />
          <main className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
            {children}
          </main>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
