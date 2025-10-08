import React from "react";
import { useAccount } from "wagmi";
import ConnectBar from "./components/ConnectBar";
import SendEthPanel from "./components/SendEthPanel";
import ActivityFeed from "./components/ActivityFeed";
import SendTokenPanel from "./components/SendTokenPanel";
import TokenBalances from "./components/TokenBalances";
import AddFriendForm from "./components/AddFriendForm";
import { MyScanProvider } from "./context/MyScanProvider";
import { ActivityProvider } from "./context/ActivityProvider";
import { BalancesProvider } from "./context/BalancesProvider";
import { FriendsProvider } from "./context/FriendsProvider";
export default function App() {
  const { address, chainId } = useAccount();
  const keySuffix = `${address || "none"}:${chainId || "0"}`;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <ConnectBar />
      <FriendsProvider key={`friends:${keySuffix}`}>
        <MyScanProvider>
          <BalancesProvider>
            <ActivityProvider>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
                <div style={{ display: "grid", gap: 16 }}>
                  <AddFriendForm />
                  <SendEthPanel />
                  <SendTokenPanel />
                  <ActivityFeed />
                </div>
                <div style={{ display: "grid", gap: 16 }}>
                  <TokenBalances />
                </div>
              </div>
            </ActivityProvider>
          </BalancesProvider>
        </MyScanProvider>
      </FriendsProvider>
    </div>
  );
}
