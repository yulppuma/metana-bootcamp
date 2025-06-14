const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20WithPartialRefund - sellBack function", function () {
    let token;
    let owner, user1;
    let contractAddress;

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("ERC20WithPartialRefund");
        token = await TokenFactory.deploy();
        await token.waitForDeployment();
        contractAddress = await token.getAddress();

        // Fund contract with 10 ETH so it can pay users on sellBack
        await owner.sendTransaction({to: contractAddress,value: ethers.parseEther("10"),});

        // Mint 1000 tokens for user1
        await user1.sendTransaction({to: contractAddress, value: ethers.parseEther("1")});
    });

    it("should allow user to sell tokens and receive ETH", async function () {
        // user1 approves the contract to spend their tokens
        console.log(await token.balanceOf(user1.address));
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
        expect(contractTokenBalance).to.equal(ethers.parseUnits("1000", 18));
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
        expect(contractTokenBalance).to.equal(ethers.parseUnits("500", 18));
    });

    it("Should allow user to mint tokens by transfering any available tokens the contract holds and minting the remaining amount", async () => {
        await token.connect(user1).mintSale({ value: ethers.parseEther("1") });

        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseUnits("2000", 18));

        await token.connect(user1).approve(contractAddress, ethers.parseUnits("1000", 18));
        const allowance = await token.allowance(user1.address, contractAddress);
        await token.connect(user1).sellBack(ethers.parseUnits("1000", 18));
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseUnits("1000", 18));
        expect(await token.balanceOf(contractAddress)).to.equal(ethers.parseUnits("1000", 18));

        const supplyBefore = await token.totalSupply();
        console.log(supplyBefore);
        expect(supplyBefore).to.equal(ethers.parseUnits("12000", 18));
        await token.connect(user1).mintSale({ value: ethers.parseEther("1") });
        expect(await token.balanceOf(user1.address)).to.equal(ethers.parseUnits("2000", 18));
        expect(await token.balanceOf(contractAddress)).to.equal(0);
        const finalSupply = await token.totalSupply();
        expect(finalSupply).to.equal(ethers.parseUnits("12000", 18));
    });
});