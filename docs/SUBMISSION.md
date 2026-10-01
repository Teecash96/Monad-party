# Monad Party

## One line

Monad Party turns repeat play in a featured Monad game and a verified social connection into a transparent sponsor funded draw.

## Problem

Web3 communities often reward noise, bots, and one time campaigns. Sponsors cannot easily prove that rewards reached active users through a fair draw.

## Solution

A wallet qualifies after it completes a verified game milestone on two different UTC days in one weekly epoch and connects a current X account. The backend publishes an auditable Merkle snapshot. Pyth Entropy selects three distinct positions. Winners claim 50, 30, and 20 percent onchain.

## Social track fit

The product joins social identity, repeat game participation, sponsor incentives, and public proof. X data stays private. Only eligible wallet positions and proofs become public.

## Technology

1. Monad EVM and native MON prizes.
2. Solidity contracts with immutable roots, unique winners, claims, pause, and rollover.
3. Pyth Entropy adapter for verifiable randomness.
4. Node, TypeScript, PostgreSQL, X OAuth 2.0 PKCE, and encrypted tokens.
5. Next.js, wagmi, and viem.
6. IPFS snapshots and Render Node services.

## Links to fill before submission

1. Live app: `TBD`
2. Source repository: `TBD`
3. Contract addresses: `TBD`
4. Demo video: `TBD`
5. Team members: `TBD`

## Proof for judges

1. MonadVision deployment transactions.
2. Pyth request and callback events.
3. IPFS snapshot and matching onchain root.
4. Three distinct winner indexes.
5. Successful winner claim and rejected duplicate claim.
6. X connect and disconnect flow with no social data in the public snapshot.
7. Two confirmed `MilestoneCompleted` events for one wallet on different UTC days.
