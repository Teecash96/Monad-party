# X application setup

## App configuration

1. Create an OAuth 2.0 confidential Web App in the X Developer Portal.
2. Enable Authorization Code with PKCE.
3. Add the production callback exactly as `https://API_HOST/api/twitter/callback`.
4. Add the deployed privacy URL as `https://WEB_HOST/privacy`.
5. Add the deployed terms URL as `https://WEB_HOST/terms`.
6. Request only `tweet.read`, `users.read`, and `offline.access`.
7. Store the client ID and client secret in the host secret store.

## Required host values

1. `TWITTER_CLIENT_ID`
2. `TWITTER_CLIENT_SECRET`
3. `TWITTER_REDIRECT_URI`
4. `TOKEN_ENCRYPTION_KEY`
5. `FRONTEND_URL`

The redirect URI must match the portal value exactly. A different scheme, host, path, or trailing slash will fail OAuth.

## Acceptance test

1. Connect a wallet.
2. Sign the single use wallet challenge.
3. Complete X authorization.
4. Confirm username and follower count in the eligibility view.
5. Disconnect X.
6. Confirm tokens are erased and the X grant is revoked.
7. Reconnect and confirm the old OAuth state cannot be reused.
