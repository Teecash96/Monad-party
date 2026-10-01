"use client";

import Link from "next/link";
import { Gift, History, Stamp, SlidersHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  ["Passport", "/passport", Stamp],
  ["Winners", "/history", History],
  ["Claim", "/claim", Gift],
  ["Admin", "/admin", SlidersHorizontal],
] as const;

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {links.map(([label, href, Icon]) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          <Icon size={19} /><span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
