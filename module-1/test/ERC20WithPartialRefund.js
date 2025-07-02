const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20WithPartialRefund - sellBack function", function () {
    let token;
    let owner, user1;
    let contractAddress;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("ERC20WithPartialRefund");
        token = await TokenFactory.deploy();
        await token.waitForDeployment();
        contractAddress = await token.getAddress();

        // Fund contract with 10 ETH so it can pay users on sellBack
        await owner.sendTransaction({to: contractAddress,value: ethers.parseEther("10"),});

        // Mint 1000 tokens for user1
        await token.connect(user1).testMint(user1.address, ethers.parseUnits("1000", 18));
    });
    it("should mint tokens when ETH is sent", async () => {
        const ethSent = ethers.parseEther("1");
        await token.connect(user1).mintSale({ value: ethSent });
        const userBalance = await token.balanceOf(user1.address);
        expect(userBalance).to.equal(ethers.parseUnits("2000", 18)); // 1000 tokens
    });
    it("should revert if amount is not greater than 0", async () => {
        await expect(token.connect(user1).mintSale({ value: ethers.parseEther("0") })).to.be.revertedWith("Must send more than 0");
    });
    it("should revert if max tokens will be minted", async () => {
        const ethSent = ethers.parseEther("9998");
        console.log(await ethers.provider.getBalance(user1.address));
        await expect(token.connect(user1).mintSale({ value: ethSent })).to.be.revertedWith("Max token supply reached.");
    });
    it("should allow user to sell tokens and receive ETH", async function () {
        // user1 approves the contract to spend their tokens
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseUnits("1000", 18));
        await token.connect(user1).approve(contractAddress, ethers.parseUnits("1000", 18));
        const allowance = await token.allowance(user1.address, contractAddress);
        console.log("Allowance set:", allowance.toString());
        console.log(user1.address);
        // User sells back 1000 tokens
        await token.connect(user1).sellBack(ethers.parseUnits("1000", 18));

        // Token balance of user should be 0 after sellBack
        const user1TokenBalance = await token.balanceOf(user1.address);
        expect(user1TokenBalance).to.equal(0);
        // Contract's token balance should be 0 (tokens burned)
        const contractTokenBalance = await token.balanceOf(contractAddress);
        expect(contractTokenBalance).to.equal(0);
    });
    it("should allow user to sell tokens and receive ETH other than 1,000", async function () {
        // user1 approves the contract to spend their tokens
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseUnits("1000", 18));
        await token.connect(user1).approve(contractAddress, ethers.parseUnits("500", 18));
        const allowance = await token.allowance(user1.address, contractAddress);
        console.log("Allowance set:", allowance.toString());
        console.log(user1.address);
        // User sells back 500 tokens
        await token.connect(user1).sellBack(ethers.parseUnits("500", 18));

        // Token balance of user should be 500 after sellBack
        const user1TokenBalance = await token.balanceOf(user1.address);
        expect(user1TokenBalance).to.equal(ethers.parseUnits("500", 18));
        // Contract's token balance should be 0 (tokens burned)
        const contractTokenBalance = await token.balanceOf(contractAddress);
        expect(contractTokenBalance).to.equal(0);
    });
    it("should revert if amount is greater than contract balance", async function () {
        await expect(token.withdraw(ethers.parseEther("100"))).to.be.revertedWith("Insufficient balance"); 
    });
    it("should revert if non-owner address calls withdraw", async function () {
        await expect(token.connect(user1).withdraw(ethers.parseEther("100"))).to.be.revertedWithCustomError(token,"OwnableUnauthorizedAccount");; 
    });
    it("should revert if amount is not greater than 0", async function () {
        // user1 approves the contract to spend their tokens
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseUnits("1000", 18));
        await token.connect(user1).approve(contractAddress, ethers.parseUnits("500", 18));
        const allowance = await token.allowance(user1.address, contractAddress);
        console.log("Allowance set:", allowance.toString());
        console.log(user1.address);
        // User sells back 500 tokens
        await expect(token.connect(user1).sellBack(0)).to.be.revertedWith("Amount must be greater than 0");
    });
    it("should revert if balance is not greater than ether to send", async function () {
        // user1 approves the contract to spend their tokens
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseUnits("1000", 18));
        await token.withdraw(ethers.parseEther("10")); // sends 1 ETH to the owner
        await token.connect(user1).approve(contractAddress, ethers.parseUnits("1000", 18));
        const allowance = await token.allowance(user1.address, contractAddress);
        // User sells back 500 tokens
        await expect(token.connect(user1).sellBack(ethers.parseUnits("1000", 18))).to.be.revertedWith("Insufficient balance");
    });
});