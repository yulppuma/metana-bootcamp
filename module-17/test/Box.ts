import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Box", function () {
  async function deployFixture() {
    const [owner, user, timelock] = await ethers.getSigners();

    const Box = await ethers.getContractFactory("Box");
    const box = await Box.deploy();
    await box.waitForDeployment();

    return { box, owner, user, timelock };
  }

  // -------------------------------------------------------------
  // CONSTRUCTOR
  // -------------------------------------------------------------

  it("sets deployer as owner", async () => {
    const { box, owner } = await loadFixture(deployFixture);
    expect(await box.owner()).to.equal(owner.address);
  });

  // -------------------------------------------------------------
  // STORE (OWNER ONLY)
  // -------------------------------------------------------------

  it("owner can store a new value", async () => {
    const { box, owner } = await loadFixture(deployFixture);

    await expect(box.connect(owner).store(123))
      .to.emit(box, "ValueChanged")
      .withArgs(123);

    expect(await box.retrieve()).to.equal(123);
  });

  it("non-owner cannot call store()", async () => {
    const { box, user } = await loadFixture(deployFixture);

    await expect(box.connect(user).store(999))
      .to.be.revertedWithCustomError(box, "OwnableUnauthorizedAccount")
      .withArgs(user.address);
  });

  // -------------------------------------------------------------
  // RETRIEVE
  // -------------------------------------------------------------

  it("retrieve returns the last stored value", async () => {
    const { box, owner } = await loadFixture(deployFixture);

    await box.connect(owner).store(42);

    expect(await box.retrieve()).to.equal(42);
  });

  // -------------------------------------------------------------
  // OWNERSHIP TRANSFER
  // -------------------------------------------------------------

  it("owner can transfer ownership to timelock", async () => {
    const { box, owner, timelock } = await loadFixture(deployFixture);

    await expect(box.connect(owner).transferOwnership(timelock.address))
      .to.emit(box, "OwnershipTransferred")
      .withArgs(owner.address, timelock.address);

    expect(await box.owner()).to.equal(timelock.address);
  });

  it("non-owner cannot transfer ownership", async () => {
    const { box, user, timelock } = await loadFixture(deployFixture);

    await expect(
      box.connect(user).transferOwnership(timelock.address)
    )
      .to.be.revertedWithCustomError(box, "OwnableUnauthorizedAccount")
      .withArgs(user.address);
  });

  // -------------------------------------------------------------
  // NEW OWNER PERMISSIONS
  // -------------------------------------------------------------

  it("new owner (timelock) can store after transfer", async () => {
    const { box, owner, timelock } = await loadFixture(deployFixture);

    // owner -> timelock
    await box.connect(owner).transferOwnership(timelock.address);

    await expect(box.connect(timelock).store(888))
      .to.emit(box, "ValueChanged")
      .withArgs(888);

    expect(await box.retrieve()).to.equal(888);
  });

  it("old owner cannot store after ownership transfer", async () => {
    const { box, owner, timelock } = await loadFixture(deployFixture);

    await box.connect(owner).transferOwnership(timelock.address);

    await expect(box.connect(owner).store(111))
      .to.be.revertedWithCustomError(box, "OwnableUnauthorizedAccount")
      .withArgs(owner.address);
  });
});
