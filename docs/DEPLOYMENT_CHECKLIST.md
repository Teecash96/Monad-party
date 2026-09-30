# Deployment checklist

## Code gate

1. Contract compile and tests pass.
2. Backend build and tests pass.
3. Frontend type check and production build pass.
4. Production dependency audits have no high or critical findings.

## External gate

1. Current Pyth Entropy address is confirmed by an official source.
2. Paid Entropy callback smoke passes on chain ID `10143`.
3. X app, callback, privacy URL, and terms URL are approved.
4. Render secrets are complete.
5. Support email and sponsor identity are final.
6. Legal review is complete before any public prize promotion.

## Contract gate

1. Deployer balance is enough for deployment.
2. Deployment confirmation chain ID is exact.
3. Contract bytecode exists at every recorded address.
4. `VRFWrapper.consumer` is `RaffleCore`.
5. `PythEntropyCoordinator.requester` is `VRFWrapper`.
6. Registry publisher is the limited backend signer.
7. Contract owners are the multisig.
8. The first pool is a small test amount.

## Service gate

1. Database migration succeeds.
2. `/health` returns 200.
3. `/health/ready` returns `ready: true` with full config required.
4. Indexer coverage starts before the first published epoch.
5. Snapshot storage and IPFS publication succeed.
6. Frontend chain, addresses, and API URL match the backend.

## Evidence gate

1. Save deployment and callback transaction links.
2. Save the root publication transaction and IPFS CID.
3. Save draw, callback, and claim transaction links.
4. Record the public application URL.
5. Record a three minute demo with no hidden manual step.
