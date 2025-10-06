import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

function decodeIdx(data: string): bigint {
  const res = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], data);
  return res[0] as bigint;
}

describe("SimpleFeedKeeper (MockV3Aggregator)", function () {
  let keeper: any;
  let m1: any;
  let m2: any;

  describe("exception-only mode", function () {
    beforeEach(async () => {
      const Mock = await ethers.getContractFactory("MockV3Aggregator");
      m1 = await Mock.deploy(8, 100_000_000n);
      await m1.waitForDeployment();
      m2 = await Mock.deploy(8, 100_000_000n);
      await m2.waitForDeployment();

      const Keeper = await ethers.getContractFactory("SimpleFeedKeeper");
      keeper = await Keeper.deploy([m1.target, m2.target], 3600, 0, false); // 1h, no cadence
      await keeper.waitForDeployment();
    });

    it("flags stale and non-positive; advances cursor", async function () {
      await increaseTime(7200); // +2h

      const ret1 = await keeper.checkUpkeep.staticCall("0x");
      const need1: boolean = ret1[0];
      const data1: string = ret1[1];
      expect(need1).to.equal(true);

      const idx0 = decodeIdx(data1);
      expect(idx0).to.equal(0n);

      const rd0 = await m1.latestRoundData();
      const updatedAt0 = rd0[3] as bigint;

      const tx1 = await keeper.performUpkeep(data1);
      await expect(tx1)
        .to.emit(keeper, "Alert").withArgs(m1.target, "stale", updatedAt0)
        .and.to.emit(keeper, "Tick").withArgs(1n, 0n);

      expect(await keeper.cursor()).to.equal(1n);

      // now make feed #1 non-positive
      await (await m2.updateAnswer(0)).wait();

      const ret2 = await keeper.checkUpkeep.staticCall("0x");
      const need2: boolean = ret2[0];
      const data2: string = ret2[1];
      expect(need2).to.equal(true);

      const idx1 = decodeIdx(data2);
      expect(idx1).to.equal(1n);

      const rd1 = await m2.latestRoundData();
      const updatedAt1 = rd1[3] as bigint;

      const tx2 = await keeper.performUpkeep(data2);
      await expect(tx2)
        .to.emit(keeper, "Alert").withArgs(m2.target, "non-positive-answer", updatedAt1)
        .and.to.emit(keeper, "Tick").withArgs(2n, 1n);

      expect(await keeper.cursor()).to.equal(0n);
    });

    it("healthy feeds => no upkeep needed", async function () {
      const ret = await keeper.checkUpkeep.staticCall("0x");
      const need: boolean = ret[0];
      expect(need).to.equal(false);
    });
  });

  describe("cadence mode", function () {
    beforeEach(async () => {
      const Mock = await ethers.getContractFactory("MockV3Aggregator");
      m1 = await Mock.deploy(8, 100_000_000n);
      await m1.waitForDeployment();
      m2 = await Mock.deploy(8, 100_000_000n);
      await m2.waitForDeployment();

      const Keeper = await ethers.getContractFactory("SimpleFeedKeeper");
      keeper = await Keeper.deploy([m1.target, m2.target], 3600, 60, true); // 1h, 60s cadence
      await keeper.waitForDeployment();
    });

    it("runs every interval; emits Tick; alerts only on issues", async function () {
      // first run due (lastTick==0)
      const r1 = await keeper.checkUpkeep.staticCall("0x");
      const need1: boolean = r1[0];
      const data1: string = r1[1];
      expect(need1).to.equal(true);
      expect(decodeIdx(data1)).to.equal(0n);

      const t1 = await keeper.performUpkeep(data1);
      await expect(t1).to.emit(keeper, "Tick").withArgs(1n, 0n);
      expect(await keeper.cursor()).to.equal(1n);

      // < interval -> not due
      const r2 = await keeper.checkUpkeep.staticCall("0x");
      const need2: boolean = r2[0];
      expect(need2).to.equal(false);

      // > interval -> due again
      await increaseTime(61);
      const r3 = await keeper.checkUpkeep.staticCall("0x");
      const need3: boolean = r3[0];
      const data3: string = r3[1];
      expect(need3).to.equal(true);
      expect(decodeIdx(data3)).to.equal(1n);

      const t2 = await keeper.performUpkeep(data3);
      await expect(t2).to.emit(keeper, "Tick").withArgs(2n, 1n);
      expect(await keeper.cursor()).to.equal(0n);

      // make current feed (#0) stale
      await increaseTime(7200);
      const r4 = await keeper.checkUpkeep.staticCall("0x");
      const need4: boolean = r4[0];
      const data4: string = r4[1];
      expect(need4).to.equal(true);

      const rd0 = await m1.latestRoundData();
      const updatedAt0 = rd0[3] as bigint;

      const t3 = await keeper.performUpkeep(data4);
      await expect(t3)
        .to.emit(keeper, "Alert").withArgs(m1.target, "stale", updatedAt0)
        .and.to.emit(keeper, "Tick").withArgs(3n, 0n);
    });
  });
});