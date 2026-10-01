import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Providers } from "./providers";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Monad Party | Weekly draws",
  description: "A verifiable weekly draw for repeat play in featured Monad games.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {process.env.NEXT_PUBLIC_PREVIEW_MODE === "true" && (
            <aside role="status" className="preview-banner">
              Preview only. Entries, X verification, and prize claims are not live.
            </aside>
          )}
          <main>{children}</main>
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
