ALTER TABLE "IndexerCursor" ADD COLUMN "partyRuleId" CHAR(66);

CREATE TABLE "PartyStamp" (
  "id" VARCHAR(80) NOT NULL,
  "partyId" CHAR(66) NOT NULL,
  "walletAddress" VARCHAR(42) NOT NULL,
  "epochId" BIGINT NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "blockHash" CHAR(66) NOT NULL,
  "txHash" CHAR(66) NOT NULL,
  "logIndex" INTEGER NOT NULL,
  "milestone" DECIMAL(78,0) NOT NULL,
  "completedAt" INTEGER NOT NULL,
  CONSTRAINT "PartyStamp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartyStamp_partyId_txHash_logIndex_key" ON "PartyStamp"("partyId", "txHash", "logIndex");
CREATE INDEX "PartyStamp_partyId_epochId_walletAddress_idx" ON "PartyStamp"("partyId", "epochId", "walletAddress");
CREATE INDEX "PartyStamp_blockNumber_idx" ON "PartyStamp"("blockNumber");
