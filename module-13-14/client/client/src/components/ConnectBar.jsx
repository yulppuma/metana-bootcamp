import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function ConnectBar() {
  return (
    <div style={{ padding: "16px 0", display: "flex", justifyContent: "space-between" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>MyScan</h1>
      <ConnectButton />
    </div>
  );
}