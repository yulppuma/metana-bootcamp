import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SimpleFeedKeeper", (m) => {
  const FEEDS         = m.getParameter<string[]>("FEEDS", [
    "0x694AA1769357215DE4FAC081bf1f309aDC325306" // ETH / USD (Sepolia)
  ]);
  const MAX_STALENESS = m.getParameter<number>("MAX_STALENESS", 21600); // 6 hours
  const INTERVAL      = m.getParameter<number>("INTERVAL", 60);         // 60s cadence
  const CADENCE_MODE  = m.getParameter<boolean>("CADENCE_MODE", true);  // cadence on

  const keeper = m.contract("SimpleFeedKeeper", [
    FEEDS,
    MAX_STALENESS,
    INTERVAL,
    CADENCE_MODE,
  ]);

  return { keeper };
});
