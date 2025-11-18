import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const MIN_DELAY = 3600; // 1 hour

describe("TimeLock (OpenZeppelin v5.x)", function () {

  // -------------------------------------------------------------
  // FIXTURE
  // -------------------------------------------------------------
  async function deployFixture() {
    const [deployer, proposer, executor, attacker, user] = await ethers.getSigners();

    const TimeLock = await ethers.getContractFactory("TimeLock");

    const proposers: string[] = [];
    const executors: string[] = [];
    const admin = deployer.address;

    const timelock = await TimeLock.deploy(
      MIN_DELAY,
      proposers,
      executors,
      admin
    );
    await timelock.waitForDeployment();

    return {
      timelock,
      deployer,
      proposer,
      executor,
      attacker,
      user
    };
  }

  // -------------------------------------------------------------
  // DEPLOYMENT
  // -------------------------------------------------------------

  it("deploys with correct minDelay", async () => {
    const { timelock } = await loadFixture(deployFixture);
    expect(await timelock.getMinDelay()).to.equal(MIN_DELAY);
  });

  it("grants DEFAULT_ADMIN_ROLE to deployer and to itself", async () => {
    const { timelock, deployer } = await loadFixture(deployFixture);

    const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, await timelock.getAddress())).to.be.true;
  });

  it("starts with zero proposers and executors", async () => {
    const { timelock, proposer, executor } = await loadFixture(deployFixture);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

    expect(await timelock.hasRole(PROPOSER_ROLE, proposer.address)).to.be.false;
    expect(await timelock.hasRole(EXECUTOR_ROLE, executor.address)).to.be.false;
  });

  // -------------------------------------------------------------
  // ROLES
  // -------------------------------------------------------------

  it("admin can grant proposer/executor/canceller roles", async () => {
    const { timelock, deployer, proposer, executor } = await loadFixture(deployFixture);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, proposer.address);
    await timelock.grantRole(CANCELLER_ROLE, proposer.address);
    await timelock.grantRole(EXECUTOR_ROLE, executor.address);

    expect(await timelock.hasRole(PROPOSER_ROLE, proposer.address)).to.be.true;
    expect(await timelock.hasRole(CANCELLER_ROLE, proposer.address)).to.be.true;
    expect(await timelock.hasRole(EXECUTOR_ROLE, executor.address)).to.be.true;
  });

  it("non-admin cannot grant roles", async () => {
    const { timelock, attacker, proposer } = await loadFixture(deployFixture);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();

    await expect(
      timelock.connect(attacker).grantRole(PROPOSER_ROLE, proposer.address)
    ).to.be.reverted;
  });

  it("admin can renounce admin role", async () => {
    const { timelock, deployer } = await loadFixture(deployFixture);

    const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    await timelock.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);

    expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.false;
  });

  // -------------------------------------------------------------
  // SCHEDULE + EXECUTE (SINGLE OPERATION)
  // -------------------------------------------------------------

  it("only proposer can schedule operations", async () => {
    const { timelock, proposer, attacker, user } = await loadFixture(deployFixture);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    await timelock.grantRole(PROPOSER_ROLE, proposer.address);

    const salt = ethers.id("TEST");
    const data = "0x";

    await expect(
      timelock.connect(attacker).schedule(user.address, 0, data, ethers.ZeroHash, salt, MIN_DELAY)
    ).to.be.revertedWithCustomError(timelock, "AccessControlUnauthorizedAccount");
  });

  it("schedules and executes after delay", async () => {
    const { timelock, deployer, proposer, user } = await loadFixture(deployFixture);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, proposer.address);
    await timelock.grantRole(EXECUTOR_ROLE, deployer.address);

    const target = user.address;
    const data = "0x";
    const salt = ethers.id("MY_SALT");

    const id = await timelock.hashOperation(
      target,
      0,
      data,
      ethers.ZeroHash,
      salt
    );

    await expect(
      timelock.connect(proposer).schedule(target, 0, data, ethers.ZeroHash, salt, MIN_DELAY)
    ).to.emit(timelock, "CallScheduled");

    await expect(
      timelock.execute(target, 0, data, ethers.ZeroHash, salt)
    ).to.be.revertedWithCustomError(timelock, "TimelockUnexpectedOperationState");

    await time.increase(MIN_DELAY + 1);

    await expect(
      timelock.execute(target, 0, data, ethers.ZeroHash, salt)
    ).to.emit(timelock, "CallExecuted");

    expect(await timelock.isOperationDone(id)).to.be.true;
  });

  // -------------------------------------------------------------
  // CANCEL
  // -------------------------------------------------------------

  it("proposer (who is also canceller) can cancel", async () => {
    const { timelock, proposer, user } = await loadFixture(deployFixture);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, proposer.address);
    await timelock.grantRole(CANCELLER_ROLE, proposer.address);

    const salt = ethers.id("CANCEL_TEST");
    const id = await timelock.hashOperation(
      user.address,
      0,
      "0x",
      ethers.ZeroHash,
      salt
    );

    await timelock.connect(proposer).schedule(
      user.address,
      0,
      "0x",
      ethers.ZeroHash,
      salt,
      MIN_DELAY
    );

    await expect(timelock.connect(proposer).cancel(id))
      .to.emit(timelock, "Cancelled")
      .withArgs(id);

    expect(await timelock.isOperation(id)).to.be.false;
  });

  // -------------------------------------------------------------
  // BATCH EXECUTION
  // -------------------------------------------------------------

  it("can schedule and execute batch operations", async () => {
    const { timelock, proposer, deployer, user } = await loadFixture(deployFixture);

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, proposer.address);
    await timelock.grantRole(EXECUTOR_ROLE, deployer.address);

    const targets = [user.address, user.address];
    const values = [0, 0];
    const payloads = ["0x", "0x"];
    const salt = ethers.id("BATCH_SALT");

    await expect(
      timelock.connect(proposer).scheduleBatch(targets, values, payloads, ethers.ZeroHash, salt, MIN_DELAY)
    ).to.emit(timelock, "CallScheduled");

    await time.increase(MIN_DELAY + 1);

    const id = await timelock.hashOperationBatch(targets, values, payloads, ethers.ZeroHash, salt);

    await expect(
      timelock.executeBatch(targets, values, payloads, ethers.ZeroHash, salt)
    ).to.emit(timelock, "CallExecuted");

    expect(await timelock.isOperationDone(id)).to.be.true;
  });
});
