"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { ConnectWallet } from "./ConnectWallet";

const links = [
  ["Eligibility", "/eligibility"],
  ["Winners", "/history"],
  ["Claim", "/claim"],
  ["Admin", "/admin"],
];

export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Monad Party home">
        <span className="brand-mark"><Ticket size={19} /></span>
        <span>Monad Party</span>
      </Link>
      <nav aria-label="Primary navigation">
        {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <ConnectWallet compact />
    </header>
  );
}
