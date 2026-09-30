# Proof of Play

Proof of Play is a weekly raffle for active Monad wallets. A wallet must complete at least three successful top level transactions in one UTC week, spend at least 0.001 MON on gas, and link an X account with at least 100 followers.

Three unique winner positions receive 50 percent, 30 percent, and 20 percent of the funded pool.

## System

| Part | Purpose |
| --- | --- |
| Solidity contracts | Immutable weekly roots, Pyth Entropy request flow, winner indexes, claims, pause, and rollover |
| Node API | Wallet signed X OAuth, eligibility status, proof delivery, audit data, and history |
| Indexer | Confirmed Monad transaction counting with transaction deduplication and reorg repair |
| Aggregator | AND eligibility join, indexed Merkle tree, optional IPFS upload, and root publication |
| Next app | Wallet connect, X connect, eligibility, history, claim, and owner controls |
| PostgreSQL | OAuth state, encrypted tokens, indexed transactions, snapshots, winners, and audit events |

The Merkle leaf is the OpenZeppelin standard leaf for these values:

```text
["uint256 epochId", "uint256 index", "address wallet"]
```

This binds each claimant to the exact position selected by randomness. An eligible wallet cannot take another rank.

## Important design correction

Chainlink does not document VRF support for Monad. The production path uses Pyth Entropy through `PythEntropyCoordinator`. The adapter expands one verified Entropy result into three deterministic words and supports retry when downstream delivery fails.

Internal contract calls do not count as wallet activity. They are not wallet signed transactions and would create an easy eligibility abuse path.

The hackathon contract accepts native MON only. Supporting arbitrary ERC20 tokens would require a token allowlist and accounting rules for fee charging and rebasing tokens. That is outside the safe MVP scope.

## Local setup

1. Start PostgreSQL with Dory. The project uses local port 5433 so it does not collide with other PostgreSQL containers.

```bash
dory compose up -d postgres
```

2. Create backend configuration.

```bash
cp backend/.env.example backend/.env
openssl rand -base64 32
```

Put the generated value in `TOKEN_ENCRYPTION_KEY`. Add your X OAuth app values. Keep all private keys out of Git.

Set `INDEXER_START_BLOCK` to a confirmed block at or before the start of the first epoch you will publish. The snapshot job refuses to create a root unless the indexer proves full confirmed coverage from the epoch start through the epoch end.

3. Install and migrate the backend.

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

4. Install and start the frontend in another terminal.

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

5. Test contracts in another terminal.

```bash
cd contracts
npm install
npm test
```

## X application setup

Use OAuth 2.0 Authorization Code with PKCE.

Set the callback to:

```text
http://localhost:3001/api/twitter/callback
```

Required scopes are `tweet.read users.read offline.access`. The app does not request write access. Set the production privacy policy and terms URLs before X review.

## Contract deployment

1. Verify the current Pyth Entropy address for the selected Monad network.

2. Set `PYTH_ENTROPY_ADDRESS`, `PRIVATE_KEY`, and the RPC value in `contracts/.env`.

3. Run the read only address and fee check.

```bash
cd contracts
npm run preflight:testnet
```

4. Complete the paid Entropy smoke only after reviewing the chain and fee.

```bash
CONFIRM_ENTROPY_SMOKE_CHAIN_ID=10143 npm run smoke:entropy:testnet
```

5. Deploy to testnet only after the callback arrives.

```bash
CONFIRM_DEPLOY_CHAIN_ID=10143 npm run deploy:testnet
```

The script deploys `EligibilityRegistry`, `PythEntropyCoordinator`, `VRFWrapper`, and `RaffleCore`. It also locks the callback links between the contracts. It refuses the wrong chain, an Entropy address without bytecode, a failed fee call, and an empty deployer balance.

6. Put the deployed registry and raffle addresses in the backend and frontend environment files.

7. Set a limited registry publisher wallet, then transfer contract ownership to the sponsor multisig. The backend publisher can set immutable roots but cannot fund, pause, draw, or change ownership.

## Weekly operations

1. Run the indexer at least hourly.

```bash
cd backend
npm run indexer
```

2. After the epoch ends, recheck X accounts and create the final snapshot. The Render schedule is Monday 00:30 UTC so final blocks can be confirmed first.

```bash
npm run snapshot
```

Set `PUBLISH_ROOT=true` only when the limited publisher key is configured as `REGISTRY_PUBLISHER_PRIVATE_KEY`. The job refuses to publish fewer than three eligible wallets.

3. Fund the epoch from the owner page or contract.

4. Request the draw after the five minute delay. Send the current Pyth fee shown in the admin page.

5. Sync winner and claim records.

```bash
npm run sync:winners
```

6. Repeat winner sync after claims. Unclaimed prizes can roll into a later epoch after 30 days.

## Verification

The repository currently passes:

```text
Contracts: 13 tests
Backend: TypeScript build and 5 unit tests
Frontend: TypeScript check and production build
Browser: 6 Playwright checks across desktop and mobile
Frontend production dependency audit: 0 vulnerabilities
Backend production dependency audit: 0 vulnerabilities
```

A live end to end result still requires real service credentials, funded Monad deployment transactions, an X developer app, PostgreSQL, and optional Pinata access. Those are external secrets and paid or authorized actions, so they are not included in this repository.

## Hosting

`render.yaml` defines native Node web and cron services plus managed PostgreSQL. It does not use Docker. Add every `sync: false` value in Render before expecting `/health/ready` to pass.

Run local configuration validation with:

```bash
cd backend
npm run validate:env
```

Use `VALIDATE_PROFILE=testnet` or `VALIDATE_PROFILE=production` for the stricter gates. Public privacy and terms pages are available at `/privacy` and `/terms`.

For a local presentation dataset only:

```bash
DEMO_MODE=true npm run demo:seed
```

The command refuses to run when `NODE_ENV=production`.

## Security notes

1. One X identity can link to only one wallet.

2. OAuth state and PKCE verifiers are random, expire after ten minutes, and are stored encrypted or hashed.

3. X access and refresh tokens use AES 256 GCM. Production should keep the encryption key in a managed secret store.

4. X link, X disconnect, and admin audit actions use short lived, single use, domain bound wallet challenges.

5. Eligibility roots are immutable after publication.

6. Contract claims use checks before effects before interactions and a reentrancy guard.

7. Public snapshots include only eligible wallet addresses, indexes, and Merkle proofs. Social profile data stays in PostgreSQL.

8. Do not deploy without an independent contract audit and a live Pyth callback test with a small pool.
