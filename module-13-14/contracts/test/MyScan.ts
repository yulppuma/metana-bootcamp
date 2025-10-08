import { expect } from "chai";
import { network } from "hardhat";
import { Contract, parseUnits } from "ethers";

const { ethers } = await network.connect();

describe("MyScan", function () {
  let myPriceFeed: any;
  let myScan: any;
  let mockFeed: any;
  let token: any;
  let addr1: any, addr2: any;

  beforeEach(async () => {
    [addr1, addr2] = await ethers.getSigners();

    // MyPriceFeed
    const PF = await ethers.getContractFactory("MyPriceFeed");
    myPriceFeed = await PF.deploy();
    await myPriceFeed.waitForDeployment();

    // Mock aggregator: 8 decimals, 2000 * 10^8
    const Mock = await ethers.getContractFactory("MockV3Aggregator");
    mockFeed = await Mock.deploy(8, 2000n * 10n ** 8n);
    await mockFeed.waitForDeployment();

    // MyScan
    const Scan = await ethers.getContractFactory("MyScan");
    myScan = await Scan.deploy(myPriceFeed.target);
    await myScan.waitForDeployment();

    // ERC20 test token & mint to addr1
    const TT = await ethers.getContractFactory("TestToken");
    token = await TT.deploy();
    await token.waitForDeployment();

    await token.mint(addr1.address, parseUnits("1000", 18));
  });

  it("sendEth: forwards ETH and emits PaymentStamped", async function () {
    const value = ethers.parseEther("1");

    const before = await ethers.provider.getBalance(addr2.address);
    const tx = await myScan.connect(addr1).sendEth(
      addr2.address,
      mockFeed.target,
      "rent",
      { value }
    );
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber!);
    const ts = BigInt(block!.timestamp);

    await expect(tx).to.emit(myScan, "PaymentStamped").withArgs(
      addr1.address,          // payer
      addr2.address,          // payee
      ethers.ZeroAddress,     // asset (ETH)
      value,                  // amount
      "rent",                 // memo
      mockFeed.target,        // feed
      2000n * 10n ** 8n,      // price
      8,                      // priceDecimals
      ts                      // updatedAt (we emit block.timestamp)
    );

    const after = await ethers.provider.getBalance(addr2.address);
    expect(after - before).to.equal(value);
  });

  it("transferERC20: reverts without allowance", async function () {
    await expect(
      myScan.connect(addr1).transferERC20(
        token.target,
        addr2.address,
        parseUnits("10", 18),
        mockFeed.target,
        "payback"
      )
    ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
  });

  it("transferERC20: succeeds after approve and emits PaymentStamped", async function () {
    const amount = parseUnits("10", 18);

    // Pre-approve MyScan from the token holder
    await (await token.connect(addr1).approve(myScan.target, amount)).wait();

    const before1 = await token.balanceOf(addr1.address);
    const before2 = await token.balanceOf(addr2.address);

    const tx = await myScan.connect(addr1).transferERC20(
      token.target,
      addr2.address,
      amount,
      mockFeed.target,
      "refund"
    );
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber!);
    const ts = BigInt(block!.timestamp);

    await expect(tx).to.emit(myScan, "PaymentStamped").withArgs(
      addr1.address,          // payer
      addr2.address,          // payee
      token.target,           // asset (ERC20)
      amount,                 // amount
      "refund",               // memo
      mockFeed.target,        // feed
      2000n * 10n ** 8n,      // price
      8,                      // priceDecimals
      ts                      // updatedAt
    );

    const after1 = await token.balanceOf(addr1.address);
    const after2 = await token.balanceOf(addr2.address);
    expect(before1 - after1).to.equal(amount);
    expect(after2 - before2).to.equal(amount);
  });

  it("sendEth: reverts on bad addr", async function () {
    await expect(
      myScan.connect(addr1).sendEth(
        ethers.ZeroAddress,
        mockFeed.target,
        "oops",
        { value: ethers.parseEther("0.1") }
      )
    ).to.be.revertedWith("Bad addr");
  });

  it("sendEth: reverts on zero value", async function () {
    await expect(
      myScan.connect(addr1).sendEth(
        addr2.address,
        mockFeed.target,
        "oops",
        { value: 0 }
      )
    ).to.be.revertedWith("No eth sent");
  });

  it("transferERC20: reverts on bad addr", async function () {
    await expect(
      myScan.connect(addr1).transferERC20(
        ethers.ZeroAddress,
        addr2.address,
        parseUnits("1", 18),
        mockFeed.target,
        "oops"
      )
    ).to.be.revertedWith("Bad addr");

    await expect(
      myScan.connect(addr1).transferERC20(
        token.target,
        ethers.ZeroAddress,
        parseUnits("1", 18),
        mockFeed.target,
        "oops"
      )
    ).to.be.revertedWith("Bad addr");
  });

  it("transferERC20: bubbles MyPriceFeed custom errors (invalid feed)", async function () {
    await (await token.connect(addr1).approve(myScan.target, parseUnits("1", 18))).wait();

    await expect(
      myScan.connect(addr1).transferERC20(
        token.target,
        addr2.address,
        parseUnits("1", 18),
        ethers.ZeroAddress, // invalid feed
        "oops"
      )
    ).to.be.revertedWithCustomError(myPriceFeed, "InvalidFeedAddress");
  });
});