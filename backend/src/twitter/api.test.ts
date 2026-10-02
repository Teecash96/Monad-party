import { getTwitterProfile } from "./api";

const originalFetch = global.fetch;
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

afterAll(() => {
  global.fetch = originalFetch;
});

test("requests public metrics and returns the follower count", async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({
    data: {
      id: "123",
      username: "party_wallet",
      public_metrics: { followers_count: 137 },
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } }));

  await expect(getTwitterProfile("access-token")).resolves.toEqual({
    id: "123",
    username: "party_wallet",
    followersCount: 137,
  });
  expect(fetchMock).toHaveBeenCalledWith("https://api.x.com/2/users/me?user.fields=public_metrics", {
    headers: { Authorization: "Bearer access-token" },
  });
});

test("fails closed when X omits follower metrics", async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({
    data: { id: "123", username: "party_wallet" },
  }), { status: 200 }));

  await expect(getTwitterProfile("access-token")).rejects.toThrow("valid follower count");
});
