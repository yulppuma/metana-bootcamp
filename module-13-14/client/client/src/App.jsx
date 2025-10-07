import React from "react";
import ConnectBar from "./components/ConnectBar";
import PriceTicker from "./components/PriceTicker";
import SendEthPanel from "./components/SendEthPanel";
import ActivityFeed from "./components/ActivityFeed";
import PriceNowButton from "./components/PriceNowButton";
import { MyScanProvider } from "./context/MyScanProvider";
import { ActivityProvider } from "./context/ActivityProvider";
import SendTokenPanel from "./components/SendTokenPanel";
import LoadOlderButton from "./components/LoadOlderButton";
import TokenBalances from "./components/TokenBalances";
import { BalancesProvider } from "./context/BalancesProvider";

export default function App() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <ConnectBar />
      <MyScanProvider>
        <BalancesProvider>
          <ActivityProvider>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
              <div style={{ display: "grid", gap: 16 }}>
                {/* your existing panels */}
                <SendEthPanel />
                <SendTokenPanel />
                <ActivityFeed />
                {/* LoadOlderButton if you added it */}
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                {/* New: token balances */}
                <TokenBalances /* onSelectToken={(addr) => ...prefill your SendTokenPanel...} */ />
                {/* your existing price widgets/buttons */}
                {/* <PriceNowButton /> */}
              </div>
            </div>
          </ActivityProvider>
        </BalancesProvider>
      </MyScanProvider>
    </div>
  );
}
