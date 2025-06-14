const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20WithSanctionsToken", function () {
    let Token, token, owner, user1, user2, user3;

    beforeEach(async () => {
        [owner, user1, user2, user3] = await ethers.getSigners();
        Token = await ethers.getContractFactory("ERC20WithSanctionsToken");
        token = await Token.deploy();
        await token.waitForDeployment();

        // Mint some tokens for testing
        await token.connect(owner).transfer(user1.address, 1000);
        await token.connect(owner).transfer(user2.address, 1000);
    });

    it("Should allow non-blacklisted users to transfer", async () => {
        await token.connect(user1).transfer(user2.address, 100);
        const balance = await token.balanceOf(user2.address);
        await expect(balance).to.equal(1100);
    });

    it("Should block transfer if sender is blacklisted", async () => {
        await token.connect(owner).addToBlacklist(user1.address);
        await expect(token.connect(user1).transfer(user2.address, 100)).to.be.reverted;
    });

    it("Should block transfer if recipient is blacklisted", async () => {
        await token.connect(owner).addToBlacklist(user2.address);
        await expect(
        token.connect(user1).transfer(user2.address, 100)
        ).to.be.revertedWith("Blacklisted address");
    });

    it("Should allow address part of the centralized authority to add/remove blacklist and authorities", async () => {
        // Add authority
        await token.connect(owner).addToCentralizedAuthority(user3.address);
        expect(await token.centralizedAuthority(user3.address)).to.be.true;

        // Let user3 blacklist someone
        await token.connect(user3).addToBlacklist(user1.address);
        expect(await token.blacklist(user1.address)).to.be.true;

        // Let user3 remove from blacklist
        await token.connect(user3).removeFromBlacklist(user1.address);
        expect(await token.blacklist(user1.address)).to.be.false;
    });

    it("Should revert if non-centralized authority tries to blacklist", async () => {
        await expect(token.connect(user1).addToBlacklist(user2.address)).to.be.revertedWith("Can't blacklist");
    });
});