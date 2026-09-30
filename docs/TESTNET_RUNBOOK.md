# Monad testnet runbook

## Network

1. Chain ID: `10143`.
2. RPC: `https://testnet-rpc.monad.xyz`.
3. Explorer: `https://testnet.monadvision.com`.
4. Faucet: `https://faucet.monad.xyz`.

The Monad testnet reset from genesis on 16 December 2025. Do not reuse addresses from the old testnet.

## Randomness preflight

1. Current verified Entropy address: `0x825c0390f379C631f3Cf11A82a37D20BddF93c07`.
2. This address passed bytecode, default provider, and `getFeeV2` checks on chain ID `10143` at block `66899319` on 30 September 2026. Recheck it before every deployment because testnet contracts can change.
3. Put it in `contracts/.env` as `PYTH_ENTROPY_ADDRESS`.
4. Run `npm run preflight:testnet` from `contracts`.
5. Stop if the address has no bytecode or `getFeeV2` fails.
6. Run the paid smoke only after explicit approval:

```bash
CONFIRM_ENTROPY_SMOKE_CHAIN_ID=10143 npm run smoke:entropy:testnet
```

Wait for `RandomnessReceived` on the smoke contract before raffle deployment.

## Deploy

1. Fund the deployer with test MON.
2. Set `PRIVATE_KEY`, `PYTH_ENTROPY_ADDRESS`, and `MONAD_TESTNET_RPC` locally.
3. Run:

```bash
CONFIRM_DEPLOY_CHAIN_ID=10143 npm run deploy:testnet
```

4. Record all addresses and the deployment block.
5. Put the registry and raffle addresses in the backend and frontend hosts.
6. Create a limited publisher wallet for the backend.
7. Set `PUBLISHER_ADDRESS` to that wallet and `NEW_OWNER` to the multisig.
8. Transfer ownership only after the exact confirmation printed by the script is reviewed.

## First epoch

1. Set `INDEXER_START_BLOCK` at or before the epoch start.
2. Run the indexer and confirm full epoch coverage.
3. Connect three real test wallets and three real X accounts.
4. Complete at least three successful transactions and the gas threshold for each wallet.
5. Run the weekly snapshot after the epoch closes and the indexer confirms the final blocks. The hosted schedule is Monday 00:30 UTC.
6. Fund the epoch with a small test amount.
7. Request the draw after the five minute delay.
8. Confirm the Entropy callback, three distinct winners, one successful claim, and one rejected duplicate claim.

## Stop conditions

Stop if the RPC chain ID is not `10143`, Entropy cannot return a fee, the callback is not received, the indexer lacks full coverage, ownership is wrong, or any address differs across contracts, backend, and frontend.
