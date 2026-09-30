export interface TwitterProfile {
  id: string;
  username: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export class TwitterApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function getTwitterProfile(accessToken: string): Promise<TwitterProfile> {
  const response = await fetch("https://api.x.com/2/users/me?user.fields=public_metrics", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new TwitterApiError(`X profile request failed with status ${response.status}`, response.status);
  }
  const body = await response.json() as { data?: TwitterProfile };
  if (!body.data) throw new Error("X profile response did not include a user");
  return body.data;
}

export async function revokeTwitterGrant(accessToken: string): Promise<void> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return;
  const response = await fetch("https://api.x.com/2/oauth2/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ token: accessToken, token_type_hint: "access_token", client_id: clientId }),
  });
  if (!response.ok && response.status !== 401) {
    throw new TwitterApiError(`X token revocation failed with status ${response.status}`, response.status);
  }
}
