const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20WithTokenSale", function () {
    let Token, token, owner, user1, user2;

    beforeEach(async () => {
        [owner, user1, user2] = await ethers.getSigners();
        Token = await ethers.getContractFactory("ERC20WithTokenSale");
        token = await Token.deploy();
        await token.waitForDeployment();
    });

    it("Should allow user to buy tokens by sending 1 ETH", async () => {
        await token.connect(user1).mintSale({ value: ethers.parseEther("1") });

        const balance = await token.balanceOf(user1.address);
        expect(balance).to.equal(ethers.parseUnits("1000", 18));
    });

    it("Should reject token purchase if max supply exceeded", async () => {
        // Mint max supply
        await token.connect(owner).mintSale({ value: ethers.parseEther("1000") });
        
        await expect(token.connect(user1).mintSale({ value: ethers.parseEther("1") })).to.be.revertedWith("Max token supply reached.");
    });
    
    it("Should mint 500 tokens for 0.5 ETH", async () => {
        await token.connect(user1).mintSale({ value: ethers.parseEther("0.5") });

        const balance = await token.balanceOf(user1.address);
        expect(balance).to.equal(ethers.parseUnits("500", 18));
    });

    it("Should allow 999,000 test mint and then 1,000 via sale, but no more", async () => {
        // Mint 999,000 tokens via testMint as the owner
        await token.connect(owner).testMint(owner.address, ethers.parseUnits("999000", 18));

        // Confirm totalSupply is 999,000
        const supplyBefore = await token.totalSupply();
        expect(supplyBefore).to.equal(ethers.parseUnits("999000", 18));

        // user1 mints 1,000 tokens with 1 ETH
        await token.connect(user1).mintSale({ value: ethers.parseEther("1") });

        // Confirm totalSupply is now 1,000,000
        const finalSupply = await token.totalSupply();
        expect(finalSupply).to.equal(ethers.parseUnits("1000000", 18));

        // Another attempt should fail due to max supply cap
        await expect(token.connect(user2).mintSale({ value: ethers.parseEther("1") })).to.be.revertedWith("Max token supply reached.");
    });

    it("Owner should be able to withdraw ETH", async () => {
        // User buys tokens (contract holds 1 ETH)
        await token.connect(user1).mintSale({ value: ethers.parseEther("1") });

        const contractBalanceBefore = await ethers.provider.getBalance(token.target);
        expect(contractBalanceBefore).to.equal(ethers.parseEther("1"));

        const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
        const tx = await token.connect(owner).withdraw(ethers.parseEther("1"));
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed * receipt.gasPrice;

        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
        expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + ethers.parseEther("1") - gasUsed,
        ethers.parseEther("0.01") // Tolerance for gas
        );
    });

    it("Should revert if non-owner tries to withdraw", async () => {
        await token.connect(user1).mintSale({ value: ethers.parseEther("1") });
        await expect(token.connect(user1).withdraw(ethers.parseEther("1"))).to.be.reverted;
    });

    it("Should revert withdraw if amount exceeds contract balance", async () => {
        await expect(token.connect(owner).withdraw(ethers.parseEther("1"))).to.be.revertedWith("Insufficient balance");
    });
});