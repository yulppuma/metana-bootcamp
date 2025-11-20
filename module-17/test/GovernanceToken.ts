import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  GovernanceToken
} from "../typechain-types";

describe("GovernanceToken", function () {

  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy(owner.address);
    await token.waitForDeployment();

    return { token, owner, user1, user2 };
  }

  // -----------------------------------------
  // DEPLOYMENT
  // -----------------------------------------

  it("should deploy with correct initial data", async function () {
    const { token, owner } = await loadFixture(deployFixture);

    expect(await token.name()).to.equal("GovernanceToken");
    expect(await token.symbol()).to.equal("GT");
    expect(await token.owner()).to.equal(owner.address);

    const totalSupply = await token.totalSupply();
    expect(totalSupply).to.equal(await token.s_maxSupply());
  });

  // -----------------------------------------
  // OWNERSHIP + MINT
  // -----------------------------------------

  it("owner can mint", async function () {
    const { token, owner, user1 } = await loadFixture(deployFixture);

    await expect(token.connect(owner).mint(user1.address, 100))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, user1.address, 100);

    expect(await token.balanceOf(user1.address)).to.equal(100);
  });

  it("non-owner cannot mint", async function () {
    const { token, user1 } = await loadFixture(deployFixture);

    await expect(token.connect(user1).mint(user1.address, 100))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  // -----------------------------------------
  // BURN
  // -----------------------------------------

  it("user can burn their own tokens", async function () {
    const { token, owner } = await loadFixture(deployFixture);

    await expect(token.connect(owner).burn(1000))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, ethers.ZeroAddress, 1000);

    const balance = await token.balanceOf(owner.address);
    expect(balance).to.equal((await token.s_maxSupply()) - 1000n);
  });

  it("cannot burn more tokens than balance", async function () {
    const { token, user1 } = await loadFixture(deployFixture);

    await expect(token.connect(user1).burn(100))
      .to.be.reverted;
  });

  // -----------------------------------------
  // TRANSFERS
  // -----------------------------------------

  it("should transfer tokens correctly", async function () {
    const { token, owner, user1 } = await loadFixture(deployFixture);

    await expect(token.transfer(user1.address, 500))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, user1.address, 500);

    expect(await token.balanceOf(user1.address)).to.equal(500);
  });

  it("should revert when transferring more than balance", async function () {
    const { token, user1 } = await loadFixture(deployFixture);

    await expect(token.connect(user1).transfer("0x000000000000000000000000000000000000dEaD", 10))
      .to.be.reverted;
  });

  // -----------------------------------------
  // DELEGATION + VOTES
  // -----------------------------------------

  it("delegation updates voting power and checkpoints", async function () {
    const { token, owner, user1 } = await loadFixture(deployFixture);

    // owner delegates to user1
    await token.delegate(user1.address);

    const votes = await token.getVotes(user1.address);
    expect(votes).to.equal(await token.totalSupply());

    const checkpoints = await token.numCheckpoints(user1.address);
    expect(checkpoints).to.equal(1);
  });

  it("delegation changes after transfer", async function () {
    const { token, owner, user1, user2 } = await loadFixture(deployFixture);

    // owner delegates to owner
    await token.delegate(owner.address);

    const supply = await token.totalSupply();
    expect(await token.getVotes(owner.address)).to.equal(supply);

    // transfer changes vote count
    await token.transfer(user1.address, 5000);

    const updatedVotes = await token.getVotes(owner.address);
    expect(updatedVotes).to.equal(supply - 5000n);
  });

  // -----------------------------------------
  // ERC20Permit + NONCES
  // -----------------------------------------

  it("supports permit and updates nonces correctly", async function () {
    const { token, owner, user1 } = await loadFixture(deployFixture);

    const nonceBefore = await token.nonces(owner.address);

    const deadline = ethers.MaxUint256;
    const value = 123n;

    const sig = await owner.signTypedData(
      {
        name: "GovernanceToken",
        version: "1",
        chainId: await owner.provider!.getNetwork().then(n => n.chainId),
        verifyingContract: await token.getAddress(),
      },
      {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      {
        owner: owner.address,
        spender: user1.address,
        value,
        nonce: nonceBefore,
        deadline,
      }
    );

    const { r, s, v } = ethers.Signature.from(sig);

    await token.permit(
      owner.address,
      user1.address,
      value,
      deadline,
      v,
      r,
      s
    );

    expect(await token.allowance(owner.address, user1.address)).to.equal(value);

    const nonceAfter = await token.nonces(owner.address);
    expect(nonceAfter).to.equal(nonceBefore + 1n);
  });

  // -----------------------------------------
  // UPDATE OVERRIDE (mint, burn, transfer path)
  // -----------------------------------------

  it("_update works for mint, transfer, and burn paths", async () => {
    const { token, owner, user1 } = await loadFixture(deployFixture);

    // MINT
    await expect(token.mint(user1.address, 500))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, user1.address, 500);

    // TRANSFER
    await token.connect(user1).transfer(owner.address, 200);

    await expect(token.connect(user1).transfer(owner.address, 50))
      .to.emit(token, "Transfer")
      .withArgs(user1.address, owner.address, 50);

    // BURN
    const balance = await token.balanceOf(owner.address);
    await expect(token.burn(100))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, ethers.ZeroAddress, 100);
  });
});
