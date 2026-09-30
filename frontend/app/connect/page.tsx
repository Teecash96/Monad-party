"use client";

import { Check, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectTwitter } from "@/components/ConnectTwitter";
import { ConnectWallet } from "@/components/ConnectWallet";

export default function ConnectPage() {
  const { address } = useAccount();
  return (
    <div className="page-shell narrow">
      <div className="page-heading">
        <p className="eyebrow">Entry setup</p>
        <h1>Connect both accounts</h1>
        <p>Your wallet signature proves ownership. OAuth lets the backend read your current follower count. The app never asks for posting access.</p>
      </div>
      <section className="setup-list">
        <div className="setup-row">
          <span className="step-icon">{address ? <Check /> : <Wallet />}</span>
          <div><h2>Monad wallet</h2><p>{address ? address : "Connect the wallet that will enter and claim."}</p></div>
          <ConnectWallet />
        </div>
        <div className="setup-row">
          <span className="step-icon">@</span>
          <div><h2>X account</h2><p>Requires at least 100 followers when the weekly snapshot is taken.</p></div>
          <ConnectTwitter />
        </div>
      </section>
    </div>
  );
}
