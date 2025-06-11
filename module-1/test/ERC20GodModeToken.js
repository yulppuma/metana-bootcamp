const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20GodModeToken", function () {
    let token, owner, addr1, addr2;

    beforeEach(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("ERC20GodModeToken");
        token = await Token.deploy();
        //await token.deployed();
    });

    it("Should mint tokens to an address (god mode)", async () => {
        await token.connect(owner).mintTokensToAddress(addr1.address, 1000);
        expect(await token.balanceOf(addr1.address)).to.equal(1000);
    });

    it("Should change a user’s balance (god mode)", async () => {
        await token.connect(owner).mintTokensToAddress(addr1.address, 500);
        await token.connect(owner).changeBalanceAtAddress(addr1.address, 800);
        expect(await token.balanceOf(addr1.address)).to.equal(800);

        await token.connect(owner).changeBalanceAtAddress(addr1.address, 300);
        expect(await token.balanceOf(addr1.address)).to.equal(300);
    });

    it("Should forcefully transfer tokens from one user to another", async () => {
        await token.connect(owner).mintTokensToAddress(addr1.address, 1000);
        await token.connect(owner).authoritativeTransferFrom(addr1.address, addr2.address, 500);
        expect(await token.balanceOf(addr1.address)).to.equal(500);
        expect(await token.balanceOf(addr2.address)).to.equal(500);
    });

    it("Should forcefully transfer tokens between users through multiple transactions", async () =>{
        await token.connect(owner).mintTokensToAddress(addr1.address, 1000);
        await token.connect(owner).authoritativeTransferFrom(addr1.address, addr2.address, 500);
        await token.connect(owner).mintTokensToAddress(addr2.address, 1000);
        expect(await token.balanceOf(addr1.address)).to.equal(500);
        expect(await token.balanceOf(addr2.address)).to.equal(1500);
        await token.connect(owner).authoritativeTransferFrom(addr2.address, addr1.address, 300);
        expect(await token.balanceOf(addr1.address)).to.equal(800);
        expect(await token.balanceOf(addr2.address)).to.equal(1200);
    });

    it("Should revert if unauthorized account tries god-mode action", async () => {
        await token.connect(owner).mintTokensToAddress(addr1.address, 1000);
        await expect(token.connect(addr1).mintTokensToAddress(addr1.address, 1000)).to.be.reverted;
        await expect(token.connect(addr1).changeBalanceAtAddress(addr1.address, 1000)).to.be.reverted;
        await expect(token.connect(addr1).authoritativeTransferFrom(addr1.address, addr2.address, 500)).to.be.reverted;
    });
});