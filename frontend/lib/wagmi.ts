import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const monad = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || 10143),
  name: process.env.NEXT_PUBLIC_MONAD_CHAIN_NAME || "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL || "https://testnet.monadvision.com",
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: { [monad.id]: http() },
  ssr: true,
});
