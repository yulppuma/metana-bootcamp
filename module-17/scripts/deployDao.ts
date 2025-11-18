import { ethers, run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();
const VOTING_DELAY = 1;
const VOTING_PERIOD = 5;
const QUORUM_PERCENTAGE = 4;
const TIMELOCK_DELAY = 3600;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) GovernanceToken
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("GovernanceToken:", token.target);

  // delegate voting power to yourself
  let tx = await token.delegate(deployer.address);
  await tx.wait();

  // 2) TimeLock
  const TimeLock = await ethers.getContractFactory("TimeLock");
  const timelock = await TimeLock.deploy(
    TIMELOCK_DELAY,
    [],
    [],
    deployer.address
  );
  await timelock.waitForDeployment();
  console.log("TimeLock:", timelock.target);

  // 3) GovernorContract
  const GovernorContract = await ethers.getContractFactory("GovernorContract");
  const governor = await GovernorContract.deploy(
    token.target,
    timelock.target,
    VOTING_DELAY,
    VOTING_PERIOD,
    QUORUM_PERCENTAGE
  );
  await governor.waitForDeployment();
  console.log("Governor:", governor.target);

  // 4) Box
  const Box = await ethers.getContractFactory("Box");
  const box = await Box.deploy();
  await box.waitForDeployment();
  console.log("Box:", box.target);

  console.log("=== Configure roles ===");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  // Governor gets proposer & canceller
  await (await timelock.grantRole(PROPOSER_ROLE, governor.target)).wait();
  await (await timelock.grantRole(CANCELLER_ROLE, governor.target)).wait();

  // Anyone can execute
  await (await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress)).wait();

  // Transfer Box ownership to timelock
  await (await box.transferOwnership(timelock.target)).wait();

  // Optionally revoke deployer admin
  await (await timelock.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address)).wait();

  console.log("DAO wired up. Ready for governance.");

  // Optional: verify on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    await run("verify:verify", {
      address: await token.getAddress(),
      constructorArguments: [deployer.address],
    });

    await run("verify:verify", {
      address: await timelock.getAddress(),
      constructorArguments: [TIMELOCK_DELAY, [], [], deployer.address],
    });

    await run("verify:verify", {
      address: await governor.getAddress(),
      constructorArguments: [
        await token.getAddress(),
        await timelock.getAddress(),
        VOTING_DELAY,
        VOTING_PERIOD,
        QUORUM_PERCENTAGE,
      ],
    });

    await run("verify:verify", {
      address: await box.getAddress(),
      constructorArguments: [],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
