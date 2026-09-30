import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db/pool";
import { decrypt, encrypt } from "./crypto";
import { getTwitterProfile, TwitterApiError } from "./api";
import { consumeWalletChallenge } from "../auth/challenge";

const STATE_TTL_MS = 10 * 60 * 1000;

interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function createAuthorization(walletAddress: string, nonce: string, signature: string) {
  const wallet = await consumeWalletChallenge(walletAddress, "twitter_link", nonce, signature);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  await prisma.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.oAuthState.create({
    data: {
      stateHash: sha256(state),
      walletAddress: wallet,
      codeVerifierEncrypted: encrypt(verifier),
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    },
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: required("TWITTER_CLIENT_ID"),
    redirect_uri: required("TWITTER_REDIRECT_URI"),
    scope: "tweet.read users.read offline.access",
    state,
    code_challenge: challenge(verifier),
    code_challenge_method: "S256",
  });
  return { authUrl: `https://x.com/i/oauth2/authorize?${params}` };
}

async function exchangeCode(code: string, verifier: string): Promise<Tokens> {
  const clientId = required("TWITTER_CLIENT_ID");
  const clientSecret = required("TWITTER_CLIENT_SECRET");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: required("TWITTER_REDIRECT_URI"),
    code_verifier: verifier,
  });
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });
  if (!response.ok) throw new TwitterApiError(`X token exchange failed with status ${response.status}`, response.status);
  return response.json() as Promise<Tokens>;
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const clientId = required("TWITTER_CLIENT_ID");
  const clientSecret = required("TWITTER_CLIENT_SECRET");
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  if (!response.ok) throw new TwitterApiError(`X token refresh failed with status ${response.status}`, response.status);
  return response.json() as Promise<Tokens>;
}

export async function completeAuthorization(state: string, code: string) {
  const stateHash = sha256(state);
  const pending = await prisma.$transaction(async (tx) => {
    const pending = await tx.oAuthState.findUnique({ where: { stateHash } });
    if (!pending || pending.usedAt || pending.expiresAt <= new Date()) throw new Error("OAuth state is invalid or expired");
    const consumed = await tx.oAuthState.updateMany({ where: { id: pending.id, usedAt: null }, data: { usedAt: new Date() } });
    if (consumed.count !== 1) throw new Error("OAuth state was already used");
    return pending;
  });

  const tokens = await exchangeCode(code, decrypt(pending.codeVerifierEncrypted));
  const profile = await getTwitterProfile(tokens.access_token);
  return prisma.$transaction(async (tx) => {
    const existingTwitter = await tx.twitterVerification.findUnique({ where: { twitterId: profile.id } });
    if (existingTwitter && existingTwitter.walletAddress !== pending.walletAddress) {
      throw new Error("This X account is already linked to another wallet");
    }

    const verification = await tx.twitterVerification.upsert({
      where: { walletAddress: pending.walletAddress },
      update: {
        twitterId: profile.id,
        username: profile.username,
        followersCount: profile.public_metrics.followers_count,
        accessTokenEncrypted: encrypt(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        verifiedAt: new Date(),
        revokedAt: null,
      },
      create: {
        walletAddress: pending.walletAddress,
        twitterId: profile.id,
        username: profile.username,
        followersCount: profile.public_metrics.followers_count,
        accessTokenEncrypted: encrypt(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    await tx.auditLog.create({
      data: { action: "twitter.connected", walletAddress: pending.walletAddress, detail: { username: profile.username } },
    });
    return verification;
  });
}

export async function recheckVerification(id: string) {
  const verification = await prisma.twitterVerification.findUnique({ where: { id } });
  if (!verification || verification.revokedAt) return;
  try {
    if (!verification.accessTokenEncrypted || !verification.tokenExpiresAt) throw new Error("X credentials are not available");
    let accessToken = decrypt(verification.accessTokenEncrypted);
    let tokenExpiresAt = verification.tokenExpiresAt;
    let refreshTokenEncrypted = verification.refreshTokenEncrypted;
    if (tokenExpiresAt.getTime() <= Date.now() + 60_000) {
      if (!refreshTokenEncrypted) throw new Error("No refresh token");
      const fresh = await refreshTokens(decrypt(refreshTokenEncrypted));
      accessToken = fresh.access_token;
      tokenExpiresAt = new Date(Date.now() + fresh.expires_in * 1000);
      refreshTokenEncrypted = fresh.refresh_token ? encrypt(fresh.refresh_token) : refreshTokenEncrypted;
    }
    const profile = await getTwitterProfile(accessToken);
    await prisma.twitterVerification.update({
      where: { id },
      data: {
        username: profile.username,
        followersCount: profile.public_metrics.followers_count,
        accessTokenEncrypted: encrypt(accessToken),
        refreshTokenEncrypted,
        tokenExpiresAt,
        verifiedAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof TwitterApiError && (error.status === 401 || error.status === 403)) {
      await prisma.twitterVerification.update({
        where: { id },
        data: {
          revokedAt: new Date(),
          accessTokenEncrypted: null,
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
        },
      });
    }
    throw error;
  }
}
