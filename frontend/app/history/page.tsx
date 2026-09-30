"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type HistoryEpoch } from "@/lib/api";

export default function HistoryPage() {
  const [epochs, setEpochs] = useState<HistoryEpoch[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void api.history().then((result) => setEpochs(result.epochs)).catch((reason) => setError(reason.message));
  }, []);

  return (
    <div className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">Public audit trail</p>
        <h1>Winner history</h1>
        <p>Published roots, eligible counts, winner positions, and claim records.</p>
      </div>
      {error && <p className="form-error">{error}</p>}
      {!error && epochs.length === 0 && <div className="empty-state">No completed draws yet.</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Epoch</th><th>Eligible</th><th>Rank</th><th>Wallet</th><th>Prize</th><th>Status</th></tr></thead>
          <tbody>
            {epochs.flatMap((epoch) => epoch.winners.length ? epoch.winners.map((winner) => (
              <tr key={`${epoch.epochId}-${winner.rank}`}>
                <td>{epoch.epochId}</td><td>{epoch.eligibleCount}</td><td>{winner.rank + 1}</td>
                <td className="mono">{winner.walletAddress.slice(0, 8)}...{winner.walletAddress.slice(-6)}</td>
                <td>{winner.prizeAmount} wei</td><td>{winner.claimedAt ? "Claimed" : "Open"}</td>
              </tr>
            )) : [<tr key={epoch.epochId}><td>{epoch.epochId}</td><td>{epoch.eligibleCount}</td><td colSpan={4}>Draw pending</td></tr>])}
          </tbody>
        </table>
      </div>
      {epochs[0]?.snapshotUri && <a className="text-link" href={epochs[0].snapshotUri.replace("ipfs://", "https://ipfs.io/ipfs/")} target="_blank" rel="noreferrer">Open latest snapshot <ExternalLink size={15} /></a>}
    </div>
  );
}
