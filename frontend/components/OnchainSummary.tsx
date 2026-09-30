"use client";

import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { contractsConfigured, raffleAbi, raffleAddress } from "@/lib/contracts";

export function OnchainSummary() {
  const epoch = useReadContract({
    address: raffleAddress,
    abi: raffleAbi,
    functionName: "currentEpochId",
    query: { enabled: contractsConfigured },
  });
  const details = useReadContract({
    address: raffleAddress,
    abi: raffleAbi,
    functionName: "epochs",
    args: [epoch.data || BigInt(0)],
    query: { enabled: contractsConfigured && epoch.data !== undefined },
  });
  const pool = details.data?.[4] || BigInt(0);
  return (
    <div className="summary-strip">
      <div><span>Current epoch</span><strong>{epoch.data?.toString() || "Not deployed"}</strong></div>
      <div><span>Prize pool</span><strong>{contractsConfigured ? `${formatEther(pool)} MON` : "Pending deployment"}</strong></div>
      <div><span>Winner split</span><strong>50 / 30 / 20</strong></div>
    </div>
  );
}
