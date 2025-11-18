import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time, mine } from "@nomicfoundation/hardhat-network-helpers";

const VOTING_DELAY = 1; // blocks
const VOTING_PERIOD = 5; // blocks
const QUORUM_PERCENTAGE = 4; // 4%
const TIMELOCK_DELAY = 3600; // 1 hour

describe("GovernorContract (Full Governance Flow)", function () {
  async function deployFixture() {
    const [deployer, proposer, voter1, voter2, executor, attacker] =
      await ethers.getSigners();

    // Governance token
    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(deployer.address);
    await token.waitForDeployment();

    // delegate to self so deployer has voting power
    await token.delegate(deployer.address);

    // Timelock with no initial proposers/executors, admin = deployer
    const TimeLock = await ethers.getContractFactory("TimeLock");
    const timelock = await TimeLock.deploy(
      TIMELOCK_DELAY,
      [],
      [],
      deployer.address
    );
    await timelock.waitForDeployment();

    // Governor
    const Governor = await ethers.getContractFactory("GovernorContract");
    const governor = await Governor.deploy(
      token.target,
      timelock.target,
      VOTING_DELAY,
      VOTING_PERIOD,
      QUORUM_PERCENTAGE
    );
    await governor.waitForDeployment();

    // Configure timelock roles for Governor
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
    const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    // Governor is proposer and canceller
    await timelock.grantRole(PROPOSER_ROLE, governor.target);
    await timelock.grantRole(CANCELLER_ROLE, governor.target);

    // Open executor role to everyone
    await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);

    // Optional: remove deployer admin powers (like production)
    await timelock.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address);

    return {
      token,
      timelock,
      governor,
      deployer,
      proposer,
      voter1,
      voter2,
      executor,
      attacker,
    };
  }

  async function createProposal(governor: any, proposer: any) {
    const targets = [proposer.address];
    const values = [0];
    const calldatas = ["0x"];
    const description = "Test proposal";

    const tx = await governor
      .connect(proposer)
      .propose(targets, values, calldatas, description);

    const receipt = await tx.wait();

    const iface = new ethers.Interface([
      "event ProposalCreated(uint256 proposalId,address proposer,address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,uint256 startBlock,uint256 endBlock,string description)",
    ]);

    const log = receipt!.logs.find(
      (l: any) =>
        l.topics[0] === iface.getEvent("ProposalCreated").topicHash
    );

    const parsed = iface.parseLog(log!);
    return parsed.args.proposalId as bigint;
  }

  // -------------------------------------------------------------
  // DEPLOYMENT / CONFIG
  // -------------------------------------------------------------

  it("deploys with correct settings", async () => {
    const { governor } = await loadFixture(deployFixture);

    expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
    expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);

    // uses your quorumNumerator() override
    expect(await governor.quorumNumerator()).to.equal(QUORUM_PERCENTAGE);
  });

  // -------------------------------------------------------------
  // PROPOSAL CREATION
  // -------------------------------------------------------------

  it("allows anyone to propose when proposalThreshold is 0", async () => {
    const { governor, attacker } = await loadFixture(deployFixture);

    const targets = [attacker.address];
    const values = [0];
    const calldatas = ["0x"];
    const description = "Proposal by attacker";

    const tx = await governor
      .connect(attacker)
      .propose(targets, values, calldatas, description);

    const receipt = await tx.wait();

    const iface = new ethers.Interface([
      "event ProposalCreated(uint256 proposalId,address proposer,address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,uint256 startBlock,uint256 endBlock,string description)",
    ]);

    const log = receipt!.logs.find(
      (l: any) =>
        l.topics[0] === iface.getEvent("ProposalCreated").topicHash
    );

    const parsed = iface.parseLog(log!);
    const proposalId = parsed.args.proposalId;

    expect(await governor.state(proposalId)).to.equal(0); // Pending
  });

  // -------------------------------------------------------------
  // VOTING
  // -------------------------------------------------------------

  it("counts votes correctly and respects voting delay/period", async () => {
    const { governor, proposer, deployer } = await loadFixture(deployFixture);

    const proposalId = await createProposal(governor, proposer);

    // Need votingDelay + 1 blocks (see OZ Governor v5 behavior)
    await mine(VOTING_DELAY + 1);

    expect(await governor.state(proposalId)).to.equal(1); // Active

    // cast vote "For" as deployer (has full voting power)
    await expect(governor.connect(deployer).castVote(proposalId, 1)).to.emit(
      governor,
      "VoteCast"
    );

    // fast-forward beyond voting period
    await mine(VOTING_PERIOD + 1);

    expect(await governor.state(proposalId)).to.equal(4); // Succeeded
  });

  // -------------------------------------------------------------
  // QUEUE
  // -------------------------------------------------------------

  it("queues a successful proposal through timelock", async () => {
    const { governor, proposer, deployer } = await loadFixture(deployFixture);

    const proposalId = await createProposal(governor, proposer);

    await mine(VOTING_DELAY + 1);
    await governor.connect(deployer).castVote(proposalId, 1);
    await mine(VOTING_PERIOD + 1);

    expect(await governor.state(proposalId)).to.equal(4); // Succeeded

    const description = "Test proposal";
    const descriptionHash = ethers.id(description);

    await expect(
      governor.queue(
        [proposer.address],
        [0],
        ["0x"],
        descriptionHash
      )
    ).to.emit(governor, "ProposalQueued");

    expect(await governor.state(proposalId)).to.equal(5); // Queued
  });

  // -------------------------------------------------------------
  // EXECUTION
  // -------------------------------------------------------------

  it("executes a queued proposal after timelock delay", async () => {
    const { governor, proposer, deployer } = await loadFixture(deployFixture);

    const proposalId = await createProposal(governor, proposer);

    await mine(VOTING_DELAY + 1);
    await governor.connect(deployer).castVote(proposalId, 1);
    await mine(VOTING_PERIOD + 1);

    const description = "Test proposal";
    const descriptionHash = ethers.id(description);

    await governor.queue(
      [proposer.address],
      [0],
      ["0x"],
      descriptionHash
    );

    expect(await governor.state(proposalId)).to.equal(5); // Queued

    await time.increase(TIMELOCK_DELAY + 1);

    await expect(
      governor.execute(
        [proposer.address],
        [0],
        ["0x"],
        descriptionHash
      )
    ).to.emit(governor, "ProposalExecuted");

    expect(await governor.state(proposalId)).to.equal(7); // Executed
  });

  // -------------------------------------------------------------
  // CANCEL
  // -------------------------------------------------------------

  it("allows proposer to cancel while pending", async () => {
    const { governor, proposer } = await loadFixture(deployFixture);

    const proposalId = await createProposal(governor, proposer);

    // Still Pending (no blocks mined yet)
    expect(await governor.state(proposalId)).to.equal(0);

    const description = "Test proposal";
    const descriptionHash = ethers.id(description);

    await expect(
      governor
        .connect(proposer)
        .cancel(
          [proposer.address],
          [0],
          ["0x"],
          descriptionHash
        )
    ).to.emit(governor, "ProposalCanceled");

    expect(await governor.state(proposalId)).to.equal(2); // Canceled
  });

  // -------------------------------------------------------------
  // OVERRIDES / VIEW FUNCTIONS
  // -------------------------------------------------------------

  it("proposalThreshold override returns 0", async () => {
    const { governor } = await loadFixture(deployFixture);
    expect(await governor.proposalThreshold()).to.equal(0);
  });

  it("proposalNeedsQueuing returns true for succeeded proposal", async () => {
    const { governor, proposer, deployer } = await loadFixture(
      deployFixture
    );

    const proposalId = await createProposal(governor, proposer);

    await mine(VOTING_DELAY + 1);
    await governor.connect(deployer).castVote(proposalId, 1);
    await mine(VOTING_PERIOD + 1);

    expect(await governor.state(proposalId)).to.equal(4); // Succeeded
    expect(await governor.proposalNeedsQueuing(proposalId)).to.equal(true);
  });
});
