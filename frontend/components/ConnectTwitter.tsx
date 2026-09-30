"use client";

import { AtSign, Link2, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { api, type TwitterStatus } from "@/lib/api";

export function ConnectTwitter() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<TwitterStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address) {
      setStatus(null);
      return;
    }
    void api.twitterStatus(address).then(setStatus).catch((reason) => setError(reason.message));
  }, [address]);

  async function signedPayload(action: "connect" | "disconnect") {
    if (!address) throw new Error("Connect your wallet first");
    const challenge = await api.twitterChallenge(address, action);
    const signature = await signMessageAsync({ message: challenge.message });
    return { walletAddress: address, nonce: challenge.nonce, signature };
  }

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const result = await api.connectTwitter(await signedPayload("connect"));
      window.location.assign(result.authUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not connect X");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError("");
    try {
      await api.disconnectTwitter(await signedPayload("disconnect"));
      setStatus({ connected: false, username: null, followersCount: 0, fresh: false, eligible: false, verifiedAt: null });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not disconnect X");
    } finally {
      setBusy(false);
    }
  }

  if (!address) return <p className="muted">Connect your wallet before you link X.</p>;
  if (status?.connected) {
    return (
      <div className="connection-row">
        <div>
          <span className="status-label"><AtSign size={17} />{status.username}</span>
          <p className="muted">{status.followersCount.toLocaleString()} followers</p>
        </div>
        <button className="button button-quiet" onClick={disconnect} disabled={busy}>
          <Unlink size={17} />Disconnect
        </button>
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
  return (
    <div>
      <button className="button button-primary" onClick={connect} disabled={busy}>
        <Link2 size={17} />{busy ? "Preparing" : "Connect X"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
