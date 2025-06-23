const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakeToken", function () {
    let token, forgeToken, addr1, addr2;

    beforeEach(async () => {
        [addr1, addr2] = await ethers.getSigners();

        //ERC1155Token Contract deployed
        const ERC1155TokenContract = await ethers.getContractFactory("ERC1155Token");
        token = await ERC1155TokenContract.deploy();
        await token.waitForDeployment();
        tokenAddress = token.getAddress();
        //ForgeERC1155Token Contract deployed
        const forgeContract = await ethers.getContractFactory("ForgeERC1155Token");
        forgeToken = await forgeContract.deploy(tokenAddress);
        await forgeToken.waitForDeployment(); 
        forgeAddress = await forgeToken.getAddress();
        await token.transferOwnership(forgeAddress);
        await forgeToken.acceptERC1155TokenOwnership();
    });
    it ("should let the Forge contract change the uri", async function(){
        await forgeToken.changeURI("ipfs://new-uri/{id}.json");
        expect(await token.uri("1")).to.equal("ipfs://new-uri/{id}.json");
    });
    it ("should let me mint token 0, if cooldown is refreshed", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
    });
    it ("should let me mint token 1, if cooldown is refreshed", async function(){
        await forgeToken.mintToken(1, '0x');
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
    });
    it ("should let me mint token 2, if cooldown is refreshed", async function(){
        await forgeToken.mintToken(2, '0x');
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
    });
    it ("should let me mint token [0-2], if cooldown is refreshed", async function(){

    });
    it ("should not let me mint token [0-2], if cooldown is not refreshed", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
        await expect(forgeToken.mintToken(0, '0x')).to.be.revertedWithCustomError(forgeToken, "CooldownActive");
        await expect(forgeToken.mintToken(1, '0x')).to.be.revertedWithCustomError(forgeToken, "CooldownActive");
        await expect(forgeToken.mintToken(2, '0x')).to.be.revertedWithCustomError(forgeToken, "CooldownActive");
        //Increase time by one minute to simluate cooldown refresh
        await time.increase(60);
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(2);
    });
    it ("should let me mint token 3, if I have enough to forge", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
        //Increase time by one minute to simluate cooldown refresh
        await time.increase(60);
        await forgeToken.mintToken(1, '0x');
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        await forgeToken.mintToken(3, '0x');
        expect (await token.balanceOf(addr1.address, 3)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
    });
    it ("should not let me mint token 3, if I don't have enough to forge", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2); 
        await expect(forgeToken.mintToken(3, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken3to5");
        expect (await token.balanceOf(addr1.address, 3)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
        await forgeToken.burnToken(0);
        await time.increase(60);
        await forgeToken.mintToken(1, '0x');
        await expect(forgeToken.mintToken(3, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken3to5");
        expect (await token.balanceOf(addr1.address, 3)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);

    });
    it ("should let me mint token 4, if I have enough to forge", async function(){
        await forgeToken.mintToken(1, '0x');
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
        //Increase time by one minute to simluate cooldown refresh
        await time.increase(60);
        await forgeToken.mintToken(2, '0x');
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        await forgeToken.mintToken(4, '0x');
        expect (await token.balanceOf(addr1.address, 4)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
    });
    it ("should not let me mint token 4, if I don't have enough to forge", async function(){
        await forgeToken.mintToken(1, '0x');
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2); 
        await expect(forgeToken.mintToken(4, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken3to5");
        expect (await token.balanceOf(addr1.address, 4)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        await forgeToken.burnToken(1);
        await time.increase(60);
        await forgeToken.mintToken(2, '0x');
        await expect(forgeToken.mintToken(4, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken3to5");
        expect (await token.balanceOf(addr1.address, 3)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
    });
    it ("should let me mint token 5, if I have enough to forge", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
        //Increase time by one minute to simluate cooldown refresh
        await time.increase(60);
        await forgeToken.mintToken(2, '0x');
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        await forgeToken.mintToken(5, '0x');
        expect (await token.balanceOf(addr1.address, 5)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
    });
    it ("should not let me mint token 5, if I don't have enough to forge", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2); 
        await expect(forgeToken.mintToken(5, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken3to5");
        expect (await token.balanceOf(addr1.address, 3)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
        await forgeToken.burnToken(0);
        await time.increase(60);
        await forgeToken.mintToken(2, '0x');
        await expect(forgeToken.mintToken(5, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken3to5");
        expect (await token.balanceOf(addr1.address, 3)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
    });
    it ("should let me mint token 6, if I have enough to forge", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2);
        //Increase time by one minute to simluate cooldown refresh
        await time.increase(60);
        await forgeToken.mintToken(1, '0x');
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        await time.increase(60);
        await forgeToken.mintToken(2, '0x');
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        await forgeToken.mintToken(6, '0x');
        expect (await token.balanceOf(addr1.address, 6)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
    });
    it ("should not let me mint token 6, if I don't have enough to forge", async function(){
        await forgeToken.mintToken(0, '0x');
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await forgeToken.lastMintTime(addr1.address)).to.be.closeTo(await time.latest(), 2); 
        await expect(forgeToken.mintToken(6, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken6");
        expect (await token.balanceOf(addr1.address, 6)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
        await forgeToken.burnToken(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        await time.increase(60);
        await forgeToken.mintToken(1, '0x');
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        await expect(forgeToken.mintToken(6, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken6");
        expect (await token.balanceOf(addr1.address, 6)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
        await forgeToken.burnToken(1);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
        await time.increase(60);
        await forgeToken.mintToken(2, '0x');
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        await expect(forgeToken.mintToken(6, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken6");
        expect (await token.balanceOf(addr1.address, 6)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        await time.increase(60);
        await forgeToken.mintToken(1, '0x');
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        await expect(forgeToken.mintToken(6, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken6");
        expect (await token.balanceOf(addr1.address, 6)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(1);
        await forgeToken.burnToken(2);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
        await time.increase(60);
        await forgeToken.mintToken(0, '0x');
        await expect(forgeToken.mintToken(6, '0x')).to.be.revertedWithCustomError(forgeToken, "InsufficientBalanceToken6");
        expect (await token.balanceOf(addr1.address, 6)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
        expect (await token.balanceOf(addr1.address, 2)).to.equal(0);
    });
    it ("should let me burn tokens", async function(){
        await forgeToken.mintToken(0, '0x');
        await forgeToken.burnToken(0);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
    });
    it ("should not let me burn tokens, if user balance is not greater than 0", async function(){
        await expect(forgeToken.burnToken(0)).to.be.revertedWith("Nothing to burn");
    });
    it ("should let me trade token [0-2]", async function(){
        await forgeToken.mintToken(0, '0x');
        await forgeToken.tradeToken(0, 1);
        expect (await token.balanceOf(addr1.address, 0)).to.equal(0);
        expect (await token.balanceOf(addr1.address, 1)).to.equal(1);
    });
    it ("should not let me trade token [0-2], if id and targetId are the same", async function(){
        await forgeToken.mintToken(0, '0x');
        await expect(forgeToken.tradeToken(0, 0)).to.be.revertedWith("Trading for same token");
    });
    it ("should not let me trade token [0-2], if id or targetId are greater than 2", async function(){
        await forgeToken.mintToken(0, '0x');
        await expect(forgeToken.tradeToken(0, 6)).to.be.revertedWith("Only Tokens[0-2] can be traded");
        await expect(forgeToken.tradeToken(5, 6)).to.be.revertedWith("Only Tokens[0-2] can be traded");        
    });
    it ("should not let me trade token [0-2], if user balance for id is not greater than 0", async function(){
        await expect(forgeToken.tradeToken(0, 1)).to.be.revertedWith("Not enough to trade");
    });
    it ("should not let any address to call ERC1155Token functions, unless its the forge contract", async function(){
        await expect (token.setURI("newuri")).to.be.revertedWithCustomError(token,"OwnableUnauthorizedAccount");
        await expect (token.mint(addr1.address, 0, 1, '0x')).to.be.revertedWithCustomError(token,"OwnableUnauthorizedAccount");        
        await expect (token.burn(addr1.address, 0, 1)).to.be.revertedWithCustomError(token,"OwnableUnauthorizedAccount");

    });
});