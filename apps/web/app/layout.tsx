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
  title: "gradientbattle",
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
    // The font variables must sit on <html>, not <body>: globals.css applies
    // `font-sans` to <html>, and a custom property defined on a child is invisible
    // to its parent — which silently fell back to the browser serif everywhere.
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {/* MathJax 2 reads window.MathJax if it exists before the library loads.
            messageStyle "none" suppresses the "Processing math: n%" status bar, which
            otherwise renders over the page while equations typeset. */}
        <Script id="mathjax-config" strategy="beforeInteractive">
          {`window.MathJax = { messageStyle: "none", showMathMenu: false };`}
        </Script>
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
