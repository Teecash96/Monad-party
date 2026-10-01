"use client";

import { Gamepad2, LockKeyhole, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { keccak256, stringToHex, zeroAddress, zeroHash } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import { partyGameAbi, partyGameAddress } from "@/lib/contracts";

const preview = process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";
const configured = !preview && partyGameAddress !== zeroAddress;

function digest(value: string) {
  return keccak256(stringToHex(value));
}

export default function GamePage() {
  const { address } = useAccount();
  const [answer, setAnswer] = useState("");
  const [salt, setSalt] = useState("");
  const [error, setError] = useState("");
  const day = useReadContract({
    address: partyGameAddress,
    abi: partyGameAbi,
    functionName: "currentDay",
    query: { enabled: configured },
  });
  const challenge = useReadContract({
    address: partyGameAddress,
    abi: partyGameAbi,
    functionName: "challengeHash",
    args: day.data === undefined ? undefined : [day.data],
    query: { enabled: configured && day.data !== undefined },
  });
  const completed = useReadContract({
    address: partyGameAddress,
    abi: partyGameAbi,
    functionName: "completed",
    args: address && day.data !== undefined ? [address, day.data] : undefined,
    query: { enabled: configured && Boolean(address) && day.data !== undefined },
  });
  const writer = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: writer.data });

  useEffect(() => {
    if (writer.error) setError(writer.error.message);
  }, [writer.error]);

  function play() {
    if (!address || day.data === undefined || !answer || !salt) {
      setError("Enter the answer and salt supplied by the featured game");
      return;
    }
    setError("");
    writer.writeContract({
      address: partyGameAddress,
      abi: partyGameAbi,
      functionName: "play",
      args: [day.data, digest(answer), digest(salt)],
    });
  }

  return (
    <div className="page-shell narrow">
      <div className="page-heading">
        <p className="eyebrow">Featured Monad game</p>
        <h1>Daily Party Challenge</h1>
        <p>Reveal today&apos;s answer with its salt. A correct play earns one passport stamp. You can complete one stamp per UTC day.</p>
      </div>

      {preview && <div className="party-callout"><strong>Game contract pending</strong><p>The preview includes the game screen. It becomes playable after the first party game contract is deployed.</p></div>}
      {!preview && partyGameAddress === zeroAddress && <div className="party-callout"><strong>Game contract pending</strong><p>Set the deployed MonadPartyGame address before playing.</p></div>}

      {configured && (
        <section className="tool-panel">
          <Gamepad2 size={24} />
          <p className="muted">UTC day {day.data?.toString() || "Loading"}</p>
          {challenge.data === undefined || challenge.isLoading ? <p className="notice">Loading today&apos;s challenge.</p> : challenge.data === zeroHash ? <p className="notice">Today&apos;s challenge is not published yet.</p> : completed.data ? <p className="success">Today&apos;s stamp is complete. Return on another UTC day.</p> : (
            <>
              {!address && <div className="connection-row"><p className="muted">Connect the wallet that will enter the draw.</p><ConnectWallet /></div>}
              {address && <>
                <label><span>Answer</span><input value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" /></label>
                <label><span>Salt</span><input value={salt} onChange={(event) => setSalt(event.target.value)} autoComplete="off" /></label>
                <button className="button button-primary" onClick={play} disabled={writer.isPending || receipt.isLoading}><Play size={17} />{writer.isPending || receipt.isLoading ? "Submitting" : "Complete challenge"}</button>
              </>}
            </>
          )}
          {receipt.isSuccess && <p className="success">Milestone confirmed. Refresh your passport.</p>}
          {error && <p className="form-error">{error}</p>}
        </section>
      )}

      {!preview && configured && <button className="button button-quiet" onClick={() => { void day.refetch(); void challenge.refetch(); void completed.refetch(); }}><RefreshCw size={17} />Refresh game</button>}
      {!configured && <p className="notice"><LockKeyhole size={17} /> Game actions are disabled until the contract is configured.</p>}
    </div>
  );
}
