const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AddressHacks security demo", function () {
  let addressHacks;

  beforeEach(async () => {
    const AddressHacks = await ethers.getContractFactory("AddressHacks");
    addressHacks = await AddressHacks.deploy();
    await addressHacks.waitForDeployment();
  });

  it("should allow calls from EOA", async () => {
    const [user] = await ethers.getSigners();

    await addressHacks.connect(user).protectedByIsContract();
    expect(await addressHacks.accessed()).to.be.true;

    await addressHacks.isAccessedFalse();

    await addressHacks.connect(user).protectedByTxOrigin();
    expect(await addressHacks.accessed()).to.be.true;
  });

  it("should bypass isContract() during constructor call", async () => {
    const AttackIsContract = await ethers.getContractFactory("AddressAttack");
    const attacker = await AttackIsContract.deploy(addressHacks.getAddress());
    await attacker.waitForDeployment();

    expect(await addressHacks.accessed()).to.be.true;
  });

  it("should revert bypassing tx.origin during constructor call", async () => {
    const AttackTxOrigin = await ethers.getContractFactory("AddressAttack2");
    await expect(
      AttackTxOrigin.deploy(addressHacks.getAddress())
    ).to.be.revertedWith("No proxy/contract calls");
  });

  it("should revert after contract deployment", async () => {
    const AttackIsContract = await ethers.getContractFactory("AddressAttack");
    const attacker = await AttackIsContract.deploy(addressHacks.getAddress());
    await attacker.waitForDeployment();

    expect(await addressHacks.accessed()).to.be.true;
    await addressHacks.isAccessedFalse();

    await expect(attacker.isContractCall()).to.be.revertedWith("Contracts not allowed");
    
  });
});