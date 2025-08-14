const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BitWise", function () {
    let bitWise, addr1, addr2;

    beforeEach(async ()=> {
        [addr1, addr2] = await ethers.getSigners();

        const BitWise = await ethers.getContractFactory("BitWise");
        bitWise = await BitWise.deploy();
        await bitWise.waitForDeployment();
    });

    it("should return 3 if data equals 7", async function(){
        expect (await bitWise.countBitSetAsm(7)).to.be.equal(3);
    });
});