import { expect } from "chai";
import { network } from "hardhat";
import { Contract, parseUnits } from 'ethers';

const { ethers } = await network.connect();

describe("MyPriceFeed", function () {
  let myPriceFeed: any;
  let mockFeed: any;
  let mockFeed2: any;

  beforeEach(async () => {
    //Deploy MyPriceFeed
    const factory = await ethers.getContractFactory("MyPriceFeed");
    myPriceFeed = await factory.deploy();
    await myPriceFeed.waitForDeployment();

    //Deploy MockFeed
    const mock = await ethers.getContractFactory("MockV3Aggregator");
    mockFeed = await mock.deploy(8, 2000n * 10n ** 8n);
    await mockFeed.waitForDeployment();

    //Deploy 2nd MockFeed for batch call
    const mock2 = await ethers.getContractFactory("MockV3Aggregator");
    mockFeed2 = await mock2.deploy(6, 1500n * 10n ** 6n);
    await mockFeed2.waitForDeployment();
  });

  it("Should let me get data feed for single tokenFeed address", async function () {
    const [price, decimal] = await myPriceFeed.getDataFeed(mockFeed.target);
    expect(price).to.equal(2000n * 10n ** 8n);
    expect(decimal).to.equal(8);
    expect(ethers.formatUnits(price, decimal)).to.equal("2000.0");
  });

  it("Should let me get data feed for multiple tokenFeed addresses", async function () {
    const feeds = [mockFeed.target, mockFeed2.target];
    const [prices, decimals] = await myPriceFeed.getBatchDataFeed(feeds);
    expect(prices[0]).to.equal(2000n * 10n ** 8n);
    expect(decimals[0]).to.equal(8);
    expect(ethers.formatUnits(prices[0], decimals[0])).to.equal("2000.0");

    expect(prices[1]).to.equal(1500n * 10n ** 6n);
    expect(decimals[1]).to.equal(6);
    expect(ethers.formatUnits(prices[1], decimals[1])).to.equal("1500.0");
  });

  it("Should revert if incorrect price feed address is passed", async function(){
    await expect(myPriceFeed.getDataFeed("0x0000000000000000000000000000000000000000")).to.be.revertedWith("Bad addr");
  });

  it("Should revert if incorrect price feed addresses are passed", async function(){
    await expect(myPriceFeed.getBatchDataFeed(["0x0000000000000000000000000000000000000000"])).to.be.revertedWith("Bad addr");
  });

  it("Should revert if price feed addresses passed are not greater than 0", async function(){
    await expect(myPriceFeed.getBatchDataFeed([])).to.be.revertedWith("No price feed");
  });
});
