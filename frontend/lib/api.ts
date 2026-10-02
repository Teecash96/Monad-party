const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL
  || (typeof window === "undefined"
    ? "http://localhost:3001"
    : `${window.location.protocol}//${window.location.hostname}:3001`);

export interface Eligibility {
  epochId: string;
  eligible: boolean;
  party: {
    configured: boolean;
    id: string | null;
    gameAddress: string | null;
    gameUrl: string | null;
    minimumMilestone: string | null;
    minimumTwitterFollowers: number;
  };
  milestoneComplete: boolean;
  returnComplete: boolean;
  activeDays: number;
  days: string[];
  twitterConnected: boolean;
  twitterFresh: boolean;
  twitterFollowersCount: number | null;
  twitterEligible: boolean;
  twitterUsername: string | null;
}

export interface Party {
  epochId: string;
  configured: boolean;
  id: string | null;
  gameAddress: string | null;
  gameUrl: string | null;
  minimumMilestone: string | null;
  requirements: string[];
}

export interface TwitterStatus {
  connected: boolean;
  username: string | null;
  followersCount: number | null;
  minimumFollowers: number;
  fresh: boolean;
  eligible: boolean;
  verifiedAt: string | null;
}

export interface MerkleProof {
  epochId: string;
  merkleRoot: string;
  eligibleCount: number;
  index: number;
  address: string;
  proof: `0x${string}`[];
}

export interface SignatureChallenge {
  nonce: string;
  expiresAt: string;
  message: string;
}

export interface SignedChallenge {
  walletAddress: string;
  nonce: string;
  signature: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === "true") {
    throw new Error("Preview only. Live entries and account verification are not available yet.");
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  party: () => request<Party>("/api/party/current"),
  eligibility: (address: string, epochId?: string) =>
    request<Eligibility>(`/api/eligibility/${address}${epochId ? `?epochId=${epochId}` : ""}`),
  twitterStatus: (address: string) => request<TwitterStatus>(`/api/twitter/status/${address}`),
  twitterChallenge: (walletAddress: string, action: "connect" | "disconnect") =>
    request<SignatureChallenge>("/api/twitter/challenge", {
      method: "POST",
      body: JSON.stringify({ walletAddress, action }),
    }),
  connectTwitter: (body: SignedChallenge) =>
    request<{ authUrl: string }>("/api/twitter/connect", { method: "POST", body: JSON.stringify(body) }),
  disconnectTwitter: (body: SignedChallenge) =>
    request<void>("/api/twitter/disconnect", { method: "POST", body: JSON.stringify(body) }),
  proof: (epochId: string, address: string) =>
    request<MerkleProof>(`/api/merkle/${epochId}/${address}`),
  history: () => request<{ epochs: HistoryEpoch[] }>("/api/history"),
  adminChallenge: (walletAddress: string) => request<SignatureChallenge>("/api/admin/challenge", {
    method: "POST",
    body: JSON.stringify({ walletAddress }),
  }),
  audit: (body: SignedChallenge) =>
    request<AuditLog[]>("/api/admin/audit", { method: "POST", body: JSON.stringify(body) }),
};

export interface HistoryEpoch {
  epochId: string;
  root: string;
  eligibleCount: number;
  snapshotUri: string | null;
  winners: Array<{
    walletAddress: string;
    rank: number;
    winnerIndex: number;
    prizeAmount: string;
    claimedAt: string | null;
    txHash: string | null;
  }>;
}

export interface AuditLog {
  id: string;
  action: string;
  walletAddress: string | null;
  detail: unknown;
  createdAt: string;
}
