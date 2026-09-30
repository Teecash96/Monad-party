"use client";

import { LogOut, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button className="button button-quiet" onClick={() => disconnect()} title="Disconnect wallet">
        <LogOut size={17} />
        {!compact && <span>{address.slice(0, 6)}...{address.slice(-4)}</span>}
      </button>
    );
  }

  return (
    <div>
      <button
        className="button button-primary"
        disabled={isPending || connectors.length === 0}
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      >
        <Wallet size={17} />
        <span>{isPending ? "Connecting" : compact ? "Connect" : "Connect wallet"}</span>
      </button>
      {error && !compact && <p className="form-error">{error.message}</p>}
    </div>
  );
}
