CREATE TABLE "TwitterVerification" (
  "id" TEXT NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "twitterId" VARCHAR(32) NOT NULL,
  "username" VARCHAR(32) NOT NULL,
  "followersCount" INTEGER NOT NULL,
  "accessTokenEncrypted" TEXT,
  "refreshTokenEncrypted" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TwitterVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthState" (
  "id" TEXT NOT NULL,
  "stateHash" CHAR(64) NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "codeVerifierEncrypted" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SignatureChallenge" (
  "id" TEXT NOT NULL,
  "nonceHash" CHAR(64) NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "purpose" VARCHAR(32) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignatureChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TxActivity" (
  "id" TEXT NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "epochId" BIGINT NOT NULL,
  "txCount" INTEGER NOT NULL DEFAULT 0,
  "gasSpentWei" DECIMAL(78,0) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TxActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IndexedTransaction" (
  "hash" CHAR(66) NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "blockHash" CHAR(66) NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "epochId" BIGINT NOT NULL,
  "gasSpentWei" DECIMAL(78,0) NOT NULL,
  CONSTRAINT "IndexedTransaction_pkey" PRIMARY KEY ("hash")
);

CREATE TABLE "IndexerCursor" (
  "chainId" INTEGER NOT NULL,
  "firstBlockNumber" INTEGER NOT NULL,
  "firstBlockTimestamp" INTEGER NOT NULL,
  "lastBlockNumber" INTEGER NOT NULL,
  "lastBlockHash" CHAR(66) NOT NULL,
  "lastBlockTimestamp" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("chainId")
);

CREATE TABLE "EligibilitySnapshot" (
  "epochId" BIGINT NOT NULL,
  "merkleRoot" CHAR(66) NOT NULL,
  "eligibleCount" INTEGER NOT NULL,
  "snapshotUri" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EligibilitySnapshot_pkey" PRIMARY KEY ("epochId")
);

CREATE TABLE "Winner" (
  "id" TEXT NOT NULL,
  "epochId" BIGINT NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "winnerIndex" INTEGER NOT NULL,
  "rank" INTEGER NOT NULL,
  "prizeAmount" DECIMAL(78,0) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "txHash" CHAR(66),
  CONSTRAINT "Winner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "walletAddress" VARCHAR(42),
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TwitterVerification_walletAddress_key" ON "TwitterVerification"("walletAddress");
CREATE UNIQUE INDEX "TwitterVerification_twitterId_key" ON "TwitterVerification"("twitterId");
CREATE INDEX "TwitterVerification_followersCount_revokedAt_idx" ON "TwitterVerification"("followersCount", "revokedAt");
CREATE UNIQUE INDEX "OAuthState_stateHash_key" ON "OAuthState"("stateHash");
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");
CREATE UNIQUE INDEX "SignatureChallenge_nonceHash_key" ON "SignatureChallenge"("nonceHash");
CREATE INDEX "SignatureChallenge_walletAddress_purpose_expiresAt_idx" ON "SignatureChallenge"("walletAddress", "purpose", "expiresAt");
CREATE INDEX "TxActivity_epochId_txCount_idx" ON "TxActivity"("epochId", "txCount");
CREATE UNIQUE INDEX "TxActivity_walletAddress_epochId_key" ON "TxActivity"("walletAddress", "epochId");
CREATE INDEX "IndexedTransaction_blockNumber_idx" ON "IndexedTransaction"("blockNumber");
CREATE INDEX "IndexedTransaction_epochId_walletAddress_idx" ON "IndexedTransaction"("epochId", "walletAddress");
CREATE INDEX "Winner_walletAddress_idx" ON "Winner"("walletAddress");
CREATE UNIQUE INDEX "Winner_epochId_rank_key" ON "Winner"("epochId", "rank");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_epochId_fkey" FOREIGN KEY ("epochId") REFERENCES "EligibilitySnapshot"("epochId") ON DELETE RESTRICT ON UPDATE CASCADE;
