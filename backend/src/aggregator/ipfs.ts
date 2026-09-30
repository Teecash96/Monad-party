export async function uploadSnapshot(payload: unknown): Promise<string | null> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return null;
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: payload,
      pinataMetadata: { name: `monad-raffle-${Date.now()}` },
    }),
  });
  if (!response.ok) throw new Error(`Pinata upload failed with status ${response.status}`);
  const body = await response.json() as { IpfsHash: string };
  return body.IpfsHash;
}
