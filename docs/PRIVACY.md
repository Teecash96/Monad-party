# Privacy policy draft

Effective date: 29 September 2026

Monad Party stores the connected wallet address, X user ID, X username, encrypted OAuth tokens, verification times, verified game milestone events, and raffle records.

The service uses this data only to verify raffle eligibility, process claims, prevent duplicate identity links, and maintain a security audit record.

OAuth tokens are encrypted at rest. Public snapshots include eligible wallet addresses, entry indexes, and Merkle proofs. They do not include X usernames, X user IDs, game activity totals, or OAuth tokens.

Users can disconnect X in the application. The service asks X to revoke the grant and then erases the stored access and refresh tokens. Users can also revoke the app in X account settings.

Onchain records and IPFS snapshots can be permanent. A deletion request cannot remove data that has already been published to a blockchain or public IPFS network.

This draft needs legal review, a legal entity name, contact address, hosting regions, retention periods, and the final service URLs before production use.
