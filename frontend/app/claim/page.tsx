"use client";

import { Gift, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { api, type MerkleProof } from "@/lib/api";
import { contractsConfigured, raffleAbi, raffleAddress } from "@/lib/contracts";

export default function ClaimPage() {
  const { address } = useAccount();
  const [epochId, setEpochId] = useState("");
  const [entry, setEntry] = useState<MerkleProof | null>(null);
  const [error, setError] = useState("");
  const writer = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: writer.data });

  async function find(event: FormEvent) {
    event.preventDefault();
    if (!address) {
      setError("Connect your wallet first");
      return;
    }
    setError("");
    setEntry(null);
    try {
      setEntry(await api.proof(epochId, address));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No proof found");
    }
  }

  function claim() {
    if (!entry || !contractsConfigured) return;
    writer.writeContract({
      address: raffleAddress,
      abi: raffleAbi,
      functionName: "claim",
      args: [BigInt(entry.epochId), BigInt(entry.index), entry.proof],
    });
  }

  return (
    <div className="page-shell narrow">
      <div className="page-heading"><p className="eyebrow">Prize withdrawal</p><h1>Claim a winning position</h1><p>Find your indexed proof, then submit it to the raffle contract.</p></div>
      <form className="inline-form" onSubmit={find}>
        <label><span>Epoch ID</span><input value={epochId} onChange={(event) => setEpochId(event.target.value)} inputMode="numeric" pattern="[0-9]+" required /></label>
        <button className="button button-quiet" type="submit"><Search size={17} />Find proof</button>
      </form>
      {entry && (
        <section className="status-panel">
          <div className="status-heading"><Gift /><div><span>Snapshot position</span><h2>Index {entry.index}</h2></div></div>
          <p className="muted">This transaction succeeds only if index {entry.index} was selected in the draw.</p>
          <button className="button button-primary" onClick={claim} disabled={!contractsConfigured || writer.isPending || receipt.isLoading}>
            <Gift size={17} />{writer.isPending || receipt.isLoading ? "Submitting" : "Claim prize"}
          </button>
          {receipt.isSuccess && <p className="success">Prize claim confirmed.</p>}
          {writer.error && <p className="form-error">{writer.error.message}</p>}
        </section>
      )}
      {!contractsConfigured && <p className="notice">Contract addresses are not configured for this frontend build.</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
