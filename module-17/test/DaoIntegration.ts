import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time, mine } from "@nomicfoundation/hardhat-network-helpers";

const VOTING_DELAY = 1;      // blocks
const VOTING_PERIOD = 5;     // blocks
const QUORUM_PERCENTAGE = 4; // 4%
const TIMELOCK_DELAY = 3600; // 1 hour

describe("DAO Integration: Governor + Timelock + Token + Box", function () {
  async function deployDaoFixture() {
    const [deployer, voter1, voter2, randomUser] = await ethers.getSigners();

    // 1) Deploy GovernanceToken
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy(deployer.address);
    await token.waitForDeployment();

    // Delegate votes to deployer so they have voting power
    await token.delegate(deployer.address);

    // 2) Deploy TimeLock
    const TimeLock = await ethers.getContractFactory("TimeLock");
    const timelock = await TimeLock.deploy(
      TIMELOCK_DELAY,
      [],                // proposers
      [],                // executors
      deployer.address   // admin
    );
    await timelock.waitForDeployment();

    // 3) Deploy GovernorContract
    const GovernorContract = await ethers.getContractFactory("GovernorContract");
    const governor = await GovernorContract.deploy(
      token.target,
      timelock.target,
      VOTING_DELAY,
      VOTING_PERIOD,
      QUORUM_PERCENTAGE
    );
    await governor.waitForDeployment();

    // 4) Deploy Box
    const Box = await ethers.getContractFactory("Box");
    const box = await Box.deploy();
    await box.waitForDeployment();

    // 5) Wire Roles on Timelock: governor is proposer + canceller, executor is "open"
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
    const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, governor.target);
    await timelock.grantRole(CANCELLER_ROLE, governor.target);
    // allow anyone to execute:
    await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);

    // optional: remove deployer admin (production-style)
    await timelock.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address);

    // 6) Transfer Box ownership to timelock (so only governance can mutate)
    await box.transferOwnership(timelock.target);

    return {
      deployer,
      voter1,
      voter2,
      randomUser,
      token,
      timelock,
      governor,
      box,
    };
  }

  async function proposeBoxStore(
    governor: any,
    box: any,
    proposerSigner: any,
    newValue: number,
    description: string
  ) {
    const encodedFunctionCall = box.interface.encodeFunctionData("store", [newValue]);
    const targets = [box.target];
    const values = [0];
    const calldatas = [encodedFunctionCall];

    const tx = await governor
      .connect(proposerSigner)
      .propose(targets, values, calldatas, description);

    const receipt = await tx.wait();
    const iface = new ethers.Interface([
      "event ProposalCreated(uint256 proposalId,address proposer,address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,uint256 startBlock,uint256 endBlock,string description)",
    ]);

    const log = receipt!.logs.find(
      (l: any) => l.topics[0] === iface.getEvent("ProposalCreated")?.topicHash
    );

    const parsed = iface.parseLog(log!);
    return {
      proposalId: parsed?.args.proposalId as bigint,
      encodedFunctionCall,
      targets,
      values,
      calldatas,
      description,
    };
  }

  it("full governance flow: propose -> vote -> queue -> execute -> Box.store()", async () => {
    const {
      deployer,
      token,
      timelock,
      governor,
      box,
    } = await loadFixture(deployDaoFixture);

    // sanity: Box owner is timelock
    expect(await box.owner()).to.equal(timelock.target);

    const NEW_VALUE = 42;
    const DESCRIPTION = "Proposal: store 42 in Box";

    // 1) Create proposal targeting Box.store(42)
    const {
      proposalId,
      encodedFunctionCall,
      targets,
      values,
      calldatas,
      description,
    } = await proposeBoxStore(governor, box, deployer, NEW_VALUE, DESCRIPTION);

    // Initially: Pending
    expect(await governor.state(proposalId)).to.equal(0); // Pending

    // 2) Wait for voting delay to pass
    await mine(VOTING_DELAY + 1);
    expect(await governor.state(proposalId)).to.equal(1); // Active

    // 3) Vote (deployer has all the voting power)
    await governor.connect(deployer).castVote(proposalId, 1); // 1 = For

    // 4) Wait until voting period is over
    await mine(VOTING_PERIOD + 1);
    expect(await governor.state(proposalId)).to.equal(4); // Succeeded

    // 5) Queue in Timelock
    const descriptionHash = ethers.id(description);
    await governor.queue(targets, values, calldatas, descriptionHash);
    expect(await governor.state(proposalId)).to.equal(5); // Queued

    // 6) Wait for timelock delay
    await time.increase(TIMELOCK_DELAY + 1);

    // 7) Execute proposal (Timelock calls Box.store(42))
    await governor.execute(targets, values, calldatas, descriptionHash);
    expect(await governor.state(proposalId)).to.equal(7); // Executed

    // 8) Verify Box value has changed
    const stored = await box.retrieve();
    expect(stored).to.equal(NEW_VALUE);
  });
});
