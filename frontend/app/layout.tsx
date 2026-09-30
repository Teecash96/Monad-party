import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Providers } from "./providers";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Monad Party | Weekly draws",
  description: "A verifiable weekly raffle for active Monad wallets and real social accounts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {process.env.NEXT_PUBLIC_PREVIEW_MODE === "true" && (
            <aside role="status" style={{ padding: "12px 24px", background: "#fff3cd", color: "#332701", textAlign: "center" }}>
              Preview only. Entries, X verification, and prize claims are not live. Party Passport and Game Night are coming next.
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
