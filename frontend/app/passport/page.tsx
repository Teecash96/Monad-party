"use client";

import { CalendarCheck, ExternalLink, Gamepad2, RefreshCw, TicketCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import { EligibilityCard } from "@/components/EligibilityCard";
import { api, type Eligibility, type Party } from "@/lib/api";

const preview = process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";

export default function PassportPage() {
  const { address } = useAccount();
  const [party, setParty] = useState<Party | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (preview) return;
    setLoading(true);
    setError("");
    try {
      const [partyValue, eligibilityValue] = await Promise.all([
        api.party(),
        address ? api.eligibility(address) : Promise.resolve(null),
      ]);
      setParty(partyValue);
      setEligibility(eligibilityValue);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the party passport");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [address]);

  return (
    <div className="page-shell passport-page">
      <div className="page-heading">
        <p className="eyebrow">This week&apos;s party</p>
        <h1>Game Night Passport</h1>
        <p>Complete the featured game milestone on two different UTC days and connect X. One completed passport creates one entry.</p>
      </div>

      <section className="passport-track" aria-label="Passport stamps">
        <article><Gamepad2 /><span>Stamp 01</span><h2>Play</h2><p>Complete the verified milestone in the featured Monad game.</p></article>
        <article><CalendarCheck /><span>Stamp 02</span><h2>Come back</h2><p>Complete the milestone again on another UTC day.</p></article>
        <article><TicketCheck /><span>Entry</span><h2>Join the draw</h2><p>Connect X and your completed passport unlocks one weekly entry.</p></article>
      </section>

      {preview && <div className="party-callout"><strong>Partner game pending</strong><p>This preview shows the passport flow. Verified stamps activate when a game contract is selected.</p></div>}
      {!preview && party?.configured && party.gameUrl && <a className="button button-primary" href={party.gameUrl} target="_blank" rel="noreferrer">Open featured game <ExternalLink size={17} /></a>}
      {!preview && party && !party.configured && <div className="party-callout"><strong>Partner game pending</strong><p>The backend is ready for a verified game contract.</p></div>}

      {!preview && !address && <div className="empty-state"><p>Connect the wallet you will use in the featured game.</p><ConnectWallet /></div>}
      {!preview && address && eligibility && <EligibilityCard value={eligibility} />}
      {!preview && address && <button className="button button-quiet" onClick={load} disabled={loading}><RefreshCw size={17} />{loading ? "Refreshing" : "Refresh stamps"}</button>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
