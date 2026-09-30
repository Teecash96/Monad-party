"use client";

import { Check, CircleAlert, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Eligibility } from "@/lib/api";

export function EligibilityCard({ value }: { value: Eligibility }) {
  const rows = [
    { label: "Monad transactions", value: `${value.txCount} of 3`, pass: value.txCount >= 3 },
    { label: "Gas spent", value: `${value.gasSpentWei} wei`, pass: BigInt(value.gasSpentWei) >= BigInt("1000000000000000") },
    { label: "X followers", value: `${value.twitterFollowers} of 100`, pass: value.twitterConnected && value.twitterFollowers >= 100 },
    { label: "X check", value: value.twitterFresh ? "Fresh" : "Needs refresh", pass: value.twitterFresh },
  ];
  return (
    <section className="status-panel">
      <div className="status-heading">
        {value.eligible ? <Check size={24} /> : <CircleAlert size={24} />}
        <div><span>Epoch {value.epochId}</span><h2>{value.eligible ? "Eligible for this draw" : "Not eligible yet"}</h2></div>
      </div>
      <div className="criteria-list">
        {rows.map((row) => (
          <div key={row.label}><span>{row.label}</span><strong className={row.pass ? "pass" : "fail"}>{row.value}</strong></div>
        ))}
      </div>
      {!value.twitterConnected && <Link href="/connect" className="text-link">Connect X <ExternalLink size={15} /></Link>}
    </section>
  );
}
