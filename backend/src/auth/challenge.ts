import { createHash, randomBytes } from "node:crypto";
import { getAddress, verifyMessage } from "ethers";
import { prisma } from "../db/pool";

export type ChallengePurpose = "twitter_link" | "twitter_disconnect" | "admin_audit";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function label(purpose: ChallengePurpose): string {
  if (purpose === "twitter_link") return "Link X account";
  if (purpose === "twitter_disconnect") return "Disconnect X account";
  return "Read sponsor audit log";
}

export function challengeMessage(walletAddress: string, purpose: ChallengePurpose, nonce: string, expiresAt: Date): string {
  const frontend = new URL(process.env.FRONTEND_URL || "http://localhost:3000");
  const chainId = process.env.MONAD_CHAIN_ID || "10143";
  return `${frontend.host} wants you to sign in with your Ethereum account:\n${getAddress(walletAddress)}\n\n${label(purpose)} for Monad Weekly Raffle.\n\nURI: ${frontend.origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nExpiration Time: ${expiresAt.toISOString()}`;
}

export async function createWalletChallenge(walletAddress: string, purpose: ChallengePurpose) {
  const wallet = getAddress(walletAddress).toLowerCase();
  const nonce = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await prisma.$transaction([
    prisma.signatureChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.signatureChallenge.create({
      data: { nonceHash: hash(nonce), walletAddress: wallet, purpose, expiresAt },
    }),
  ]);
  return { nonce, expiresAt: expiresAt.toISOString(), message: challengeMessage(wallet, purpose, nonce, expiresAt) };
}

export async function consumeWalletChallenge(
  walletAddress: string,
  purpose: ChallengePurpose,
  nonce: string,
  signature: string,
): Promise<string> {
  const wallet = getAddress(walletAddress).toLowerCase();
  const record = await prisma.signatureChallenge.findUnique({ where: { nonceHash: hash(nonce) } });
  if (!record || record.walletAddress !== wallet || record.purpose !== purpose || record.usedAt || record.expiresAt <= new Date()) {
    throw new Error("Signature challenge is invalid or expired");
  }
  const signer = getAddress(verifyMessage(challengeMessage(wallet, purpose, nonce, record.expiresAt), signature)).toLowerCase();
  if (signer !== wallet) throw new Error("Wallet signature does not match");
  const consumed = await prisma.signatureChallenge.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) throw new Error("Signature challenge was already used");
  return wallet;
}
