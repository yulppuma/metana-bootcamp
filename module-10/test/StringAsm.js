const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StringAsm", function () {
    let stringAsm, addr1, addr2;

    beforeEach(async ()=> {
        [addr1, addr2] = await ethers.getSigners();

        const StringAsm = await ethers.getContractFactory("String");
        stringAsm = await StringAsm.deploy();
        await stringAsm.waitForDeployment();
    });
    it("should return 0x6300 with input abcdef, and index 2", async function(){
        expect(await stringAsm.charAt("abcdef", 2)).to.be.equal('0x6300');
    });
    it("should return 0x6300 with empty string input, and index 0", async function(){
        expect(await stringAsm.charAt("", 0)).to.be.equal('0x0000');
    });
    it("should return 0x6300 with input george, and index 10", async function(){
        expect(await stringAsm.charAt("george", 10)).to.be.equal('0x0000');
    });
});