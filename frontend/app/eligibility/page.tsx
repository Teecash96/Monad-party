"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import { EligibilityCard } from "@/components/EligibilityCard";
import { api, type Eligibility } from "@/lib/api";

export default function EligibilityPage() {
  const { address } = useAccount();
  const [value, setValue] = useState<Eligibility | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      setValue(await api.eligibility(address));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load eligibility");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [address]);

  return (
    <div className="page-shell narrow">
      <div className="page-heading">
        <p className="eyebrow">Live status</p>
        <h1>Weekly eligibility</h1>
        <p>The final result is fixed only when the weekly snapshot is published.</p>
      </div>
      {!address && <div className="empty-state"><p>Connect the wallet you used on Monad.</p><ConnectWallet /></div>}
      {address && value && <EligibilityCard value={value} />}
      {address && <button className="button button-quiet" onClick={load} disabled={loading}><RefreshCw size={17} />{loading ? "Refreshing" : "Refresh"}</button>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
