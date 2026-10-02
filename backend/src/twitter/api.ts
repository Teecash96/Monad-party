export interface TwitterProfile {
  id: string;
  username: string;
  followersCount: number;
}

interface TwitterProfileResponse {
  data?: {
    id?: unknown;
    username?: unknown;
    public_metrics?: {
      followers_count?: unknown;
    };
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
  const body = await response.json() as TwitterProfileResponse;
  const profile = body.data;
  const followersCount = profile?.public_metrics?.followers_count;
  if (typeof profile?.id !== "string" || typeof profile.username !== "string") {
    throw new Error("X profile response did not include a user");
  }
  if (typeof followersCount !== "number" || !Number.isSafeInteger(followersCount) || followersCount < 0) {
    throw new Error("X profile response did not include a valid follower count");
  }
  return { id: profile.id, username: profile.username, followersCount };
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
