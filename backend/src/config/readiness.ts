import { isAddress } from "ethers";
import { prisma } from "../db/pool";

export type ValidationProfile = "local" | "testnet" | "production";

interface Check {
  ready: boolean;
  missing: string[];
}

function present(...names: string[]): Check {
  return { ready: names.every((name) => Boolean(process.env[name])), missing: names.filter((name) => !process.env[name]) };
}

function validAddress(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && isAddress(value));
}

function validEncryptionKey(): boolean {
  const value = process.env.TOKEN_ENCRYPTION_KEY;
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

export function configReadiness() {
  const database = present("DATABASE_URL");
  const network = present("MONAD_RPC_URL", "MONAD_CHAIN_ID");
  network.ready = network.ready && Number(process.env.MONAD_CHAIN_ID) === 10143;
  if (!network.ready && !network.missing.includes("MONAD_CHAIN_ID")) network.missing.push("MONAD_CHAIN_ID=10143");

  const twitter = present("TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET", "TWITTER_REDIRECT_URI", "TOKEN_ENCRYPTION_KEY");
  twitter.ready = twitter.ready && validEncryptionKey();
  if (!twitter.ready && process.env.TOKEN_ENCRYPTION_KEY && !validEncryptionKey()) {
    twitter.missing.push("TOKEN_ENCRYPTION_KEY(32-byte base64)");
  }

  const contracts = present("ELIGIBILITY_REGISTRY_ADDRESS", "RAFFLE_CORE_ADDRESS");
  contracts.ready = contracts.ready && validAddress("ELIGIBILITY_REGISTRY_ADDRESS") && validAddress("RAFFLE_CORE_ADDRESS");
  if (!contracts.ready && contracts.missing.length === 0) contracts.missing.push("valid contract addresses");

  const indexing = present("INDEXER_START_BLOCK");
  const publishing = present("PINATA_JWT", "REGISTRY_PUBLISHER_PRIVATE_KEY");
  publishing.ready = publishing.ready && process.env.PUBLISH_ROOT === "true";
  if (process.env.PUBLISH_ROOT !== "true") publishing.missing.push("PUBLISH_ROOT=true");

  return { database, network, twitter, contracts, indexing, publishing };
}

export function validateEnvironment(profile: ValidationProfile): string[] {
  const checks = configReadiness();
  const required = profile === "local"
    ? ["database", "network"] as const
    : ["database", "network", "twitter", "contracts", "indexing", "publishing"] as const;
  const issues = required.flatMap((name) => checks[name].missing.map((item) => `${name}: ${item}`));

  if (profile === "production") {
    for (const name of ["FRONTEND_URL", "TWITTER_REDIRECT_URI"] as const) {
      const value = process.env[name];
      if (!value?.startsWith("https://")) issues.push(`${name} must use HTTPS`);
    }
    if (process.env.NODE_ENV !== "production") issues.push("NODE_ENV must be production");
  }
  return [...new Set(issues)];
}

export async function runtimeReadiness() {
  let databaseReady = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReady = true;
  } catch {
    databaseReady = false;
  }
  const features = configReadiness();
  const requireFull = process.env.REQUIRE_FULL_CONFIG === "true";
  const requested = (process.env.REQUIRED_FEATURES || "network,twitter,contracts,indexing,publishing")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean) as Array<keyof typeof features>;
  const featureReady = requested.every((name) => features[name]?.ready === true);
  return {
    ready: databaseReady && (!requireFull || featureReady),
    database: { ready: databaseReady },
    features,
  };
}
