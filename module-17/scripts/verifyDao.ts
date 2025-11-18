import { run } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Starting DAO contract verification...");

  // Deployed contracts
  const GOVERNANCE_TOKEN = "0xFf76BaC9ed711A7D70051d207ec385Dd6fb084cD";
  const TIMELOCK = "0x578fa56b04CD5e61C1Bb011Edd547397f1Ee0C0c";
  const GOVERNOR = "0x69A5469123E155551d8BD823C738d9f2d0452031";
  const BOX = "0x3f33cFB17D38383904350b77Ec27ccBf441D5C64";

  const INITIAL_OWNER = "0x17ffbcC299688241Ed00E0A88ab379eD99d3445B";

  // constructor args
  const VOTING_DELAY = 1;
  const VOTING_PERIOD = 5;
  const QUORUM_PERCENTAGE = 4;
  const TIMELOCK_DELAY = 3600;

  console.log("Verifying GovernanceToken...");
  await run("verify:verify", {
    address: GOVERNANCE_TOKEN,
    constructorArguments: [INITIAL_OWNER],
    contract: "contracts/GovernanceToken.sol:GovernanceToken",
  });

  console.log("Verifying TimeLock...");
  await run("verify:verify", {
    address: TIMELOCK,
    constructorArguments: [
      TIMELOCK_DELAY,
      [],
      [],
      INITIAL_OWNER,
    ],
    contract: "contracts/Timelock.sol:TimeLock",
  });

  console.log("Verifying GovernorContract...");
  await run("verify:verify", {
    address: GOVERNOR,
    constructorArguments: [
      GOVERNANCE_TOKEN,
      TIMELOCK,
      VOTING_DELAY,
      VOTING_PERIOD,
      QUORUM_PERCENTAGE,
    ],
    contract: "contracts/GovernorContract.sol:GovernorContract",
  });

  console.log("Verifying Box...");
  await run("verify:verify", {
    address: BOX,
    constructorArguments: [],
    contract: "contracts/Box.sol:Box",
  });

  console.log("🎉 All DAO contracts verified!");
}

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exitCode = 1;
});
