import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MyScanModule", (m) => {
  // 1) Deploy MyPriceFeed
  const myPriceFeed = m.contract("MyPriceFeed");

  // 2) Deploy MyScan, passing MyPriceFeed to the constructor
  const myScan = m.contract("MyScan", [myPriceFeed]);

  // (Optional) add post-deploy calls here via m.call(...)
  return { myPriceFeed, myScan };
});