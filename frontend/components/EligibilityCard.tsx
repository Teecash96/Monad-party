"use client";

import { Check, CircleAlert, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Eligibility } from "@/lib/api";

export function EligibilityCard({ value }: { value: Eligibility }) {
  const rows = [
    { label: "Game milestone", value: value.milestoneComplete ? "Stamped" : "Not completed", pass: value.milestoneComplete },
    { label: "Second active day", value: value.returnComplete ? "Stamped" : `${value.activeDays} of 2 days`, pass: value.returnComplete },
    { label: "X connection", value: value.twitterFresh ? `@${value.twitterUsername}` : "Needs connection", pass: value.twitterFresh },
    { label: "Weekly entry", value: value.eligible ? "Unlocked" : "Locked", pass: value.eligible },
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
      {value.party.gameUrl && !value.returnComplete && <a href={value.party.gameUrl} target="_blank" rel="noreferrer" className="text-link">Play the featured game <ExternalLink size={15} /></a>}
    </section>
  );
}
