"use client";

import { Coins, Dice5, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { parseEther, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useSignMessage, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { api, type AuditLog } from "@/lib/api";
import { contractsConfigured, raffleAbi, raffleAddress, randomnessAbi } from "@/lib/contracts";

export default function AdminPage() {
  const { address } = useAccount();
  const [epochId, setEpochId] = useState("");
  const [amount, setAmount] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const owner = useReadContract({
    address: raffleAddress,
    abi: raffleAbi,
    functionName: "owner",
    query: { enabled: contractsConfigured },
  });
  const currentEpoch = useReadContract({
    address: raffleAddress,
    abi: raffleAbi,
    functionName: "currentEpochId",
    query: { enabled: contractsConfigured },
  });
  const wrapper = useReadContract({
    address: raffleAddress,
    abi: raffleAbi,
    functionName: "vrfWrapper",
    query: { enabled: contractsConfigured },
  });
  const fee = useReadContract({
    address: (wrapper.data || zeroAddress) as Address,
    abi: randomnessAbi,
    functionName: "getRequestFee",
    query: { enabled: Boolean(wrapper.data) },
  });
  const writer = useWriteContract();
  const signer = useSignMessage();
  const receipt = useWaitForTransactionReceipt({ hash: writer.data });
  const isOwner = Boolean(address && owner.data && address.toLowerCase() === owner.data.toLowerCase());

  useEffect(() => {
    if (currentEpoch.data !== undefined) setEpochId(currentEpoch.data.toString());
  }, [currentEpoch.data]);

  async function loadAudit() {
    if (!address) return;
    const challenge = await api.adminChallenge(address);
    const signature = await signer.signMessageAsync({ message: challenge.message });
    setLogs(await api.audit({ walletAddress: address, nonce: challenge.nonce, signature }));
  }

  function fund(event: FormEvent) {
    event.preventDefault();
    const value = parseEther(amount);
    writer.writeContract({
      address: raffleAddress,
      abi: raffleAbi,
      functionName: "fundEpoch",
      args: [BigInt(epochId), zeroAddress, value],
      value,
    });
  }

  function draw() {
    writer.writeContract({
      address: raffleAddress,
      abi: raffleAbi,
      functionName: "requestDraw",
      args: [BigInt(epochId)],
      value: fee.data || BigInt(0),
    });
  }

  if (!contractsConfigured) {
    return <div className="page-shell narrow"><div className="empty-state">Deploy the contracts and set the public contract addresses before using admin controls.</div></div>;
  }
  if (!isOwner) {
    return (
      <div className="page-shell narrow">
        <div className="empty-state"><ShieldAlert size={28} /><h1>Owner access required</h1><p>Connect the contract owner or sponsor multisig wallet.</p></div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-heading"><p className="eyebrow">Sponsor operations</p><h1>Raffle administration</h1><p>Fund an epoch and request its draw after the snapshot and delay are complete.</p></div>
      <div className="admin-grid">
        <form className="tool-panel" onSubmit={fund}>
          <Coins /><h2>Fund epoch</h2>
          <label><span>Epoch ID</span><input value={epochId} onChange={(event) => setEpochId(event.target.value)} required /></label>
          <label><span>MON amount</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required /></label>
          <button className="button button-primary" type="submit" disabled={writer.isPending}><Coins size={17} />Fund</button>
        </form>
        <section className="tool-panel">
          <Dice5 /><h2>Request draw</h2>
          <p className="muted">Randomness fee: {fee.data?.toString() || "0"} wei</p>
          <button className="button button-primary" onClick={draw} disabled={writer.isPending}><Dice5 size={17} />Request draw</button>
        </section>
      </div>
      {receipt.isLoading && <p className="notice">Waiting for confirmation.</p>}
      {receipt.isSuccess && <p className="success">Transaction confirmed.</p>}
      {writer.error && <p className="form-error">{writer.error.message}</p>}
      <section className="audit-list"><h2>Recent audit events</h2><button className="button button-quiet" onClick={loadAudit}>Load signed audit</button>{logs.map((log) => <div key={log.id}><span>{log.action}</span><time>{new Date(log.createdAt).toLocaleString()}</time></div>)}</section>
    </div>
  );
}
