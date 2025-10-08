import React, { useEffect, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useMyScan } from "../context/MyScanProvider";

export default function PriceTicker() {
  const { address } = useAccount();
  const { data: bal } = useBalance({ address, query: { enabled: !!address } });
  const { getEthUsdNow } = useMyScan();
  const [ethUsd, setEthUsd] = useState(null);

  useEffect(() => { (async () => setEthUsd(await getEthUsdNow()))(); }, [getEthUsdNow]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>Address</div>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>
        {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Balance</div>
          <div style={{ fontWeight: 600 }}>
            {bal ? `${Number(bal.value) / 10 ** bal.decimals} ${bal.symbol}` : "—"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>ETH/USD now</div>
          <div style={{ fontWeight: 600 }}>{ethUsd ? `$${ethUsd.toLocaleString()}` : "—"}</div>
        </div>
      </div>
    </div>
  );
}
