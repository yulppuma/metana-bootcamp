import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http, fallback } from "viem"; // ✅ correct import

const queryClient = new QueryClient();

const RPC_PRIMARY = import.meta.env.VITE_SEPOLIA_RPC || null;

const providers = [
  RPC_PRIMARY && http(RPC_PRIMARY),
  http("https://1rpc.io/sepolia"),
  http("https://sepolia.gateway.tenderly.co"),
].filter(Boolean);

// if only one provider, use it; otherwise use viem's fallback transport
const transportForSepolia = providers.length === 1 ? providers[0] : fallback(providers, {
  rank: false,    
  retryCount: 2, 
});

const wagmiConfig = getDefaultConfig({
  appName: "MyScan",
  projectId: import.meta.env.VITE_WC_PROJECT_ID || "missing_project_id",
  chains: [sepolia],
  transports: { [sepolia.id]: transportForSepolia },
});

export default function WalletProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
