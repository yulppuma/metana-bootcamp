const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakeToken", function () {
    let ERC20Token, ERC721Token, token, addr1, addr2;

    beforeEach(async () => {
        [addr1, addr2] = await ethers.getSigners();

        //ERC20 Contract deployed
        const ERC20TokenContract = await ethers.getContractFactory("StakeERC20Token");
        ERC20Token = await ERC20TokenContract.deploy();
        await ERC20Token.waitForDeployment();
        //ERC721 Contract deployed
        const ERC721TokenContract = await ethers.getContractFactory("StakeERC721Token");
        ERC721Token = await ERC721TokenContract.deploy();
        await ERC721Token.waitForDeployment();
        //Stake Contract deployed
        const Token = await ethers.getContractFactory("StakeToken");
        token = await Token.deploy(ERC20Token.getAddress(), ERC721Token.getAddress());
        await token.waitForDeployment();
        contractAddress = await token.getAddress();
        await ERC20Token.transferOwnership(contractAddress);
        await token.acceptERC20ContractOwnership();
    });
    it ("should let me stake my NFT", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        //Addr1 will approved contract to stake their NFT
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);
        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
    });

    it ("should not let me mint ERC20 tokens for free", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        await expect(ERC20Token.connect(addr1).mint(addr1.address, ethers.parseUnits("10", 18))).to.be.revertedWithCustomError(ERC20Token, "OwnableUnauthorizedAccount");
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
    });

    it ("should revert if onERC721Received is called by non-NFT contract", async function(){
        await expect(token.connect(addr1).onERC721Received(addr1.address, addr2.address, 1, "0x")).to.be.revertedWith("Not ERC721 contract");
    });

    it ("should not let me or anyone else to re-stake my NFT", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);
        //Revert since Addr2 doesn't own NFT(0)
        await expect(token.connect(addr2).stakeNFT(0)).to.be.revertedWith("Not owner of NFT");
        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        //Trying to re-stake
        await expect(token.connect(addr1).stakeNFT(0)).to.be.revertedWith("Not owner of NFT");
    });

    it ("should let me claim my rewards if time interval is >= 24hrs", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);

        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        //Simulate 48hrs passing
        await time.increase(48*60*60);
        await token.connect(addr1).claimRewards(0);
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(ethers.parseUnits("20", 18));
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
    });

    it ("should not let me claim my rewards if I am not the original owner", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);

        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        //Try to redeem rewards from with Addr2
        await expect(token.connect(addr2).claimRewards(0)).to.be.revertedWith("Not original owner");
    });

    it ("should not let me claim rewards if time interval is < 24hrs", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);

        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        //Should revert since no time has passed since staking
        await expect(token.connect(addr1).claimRewards(0)).to.be.revertedWith("No rewards");
    });

    it ("should let me withdraw my NFT if I am the original owner", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);

        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        await token.connect(addr1).withdrawNFT(0);
        expect(await ERC20Token.balanceOf(addr1)).to.equal(0);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
    });

    it ("should let me withdraw my NFT if I am the original owner and claim all available rewards", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);

        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        //Simulate 48hrs passing
        await time.increase(48*60*60);
        await token.connect(addr1).withdrawNFT(0);
        expect(await ERC20Token.balanceOf(addr1)).to.equal(ethers.parseUnits("20", 18));
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
    });

    it ("should not let me withdraw an NFT if I am not the original owner", async function(){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC20Token.balanceOf(addr2.address)).to.equal(0);
        await ERC721Token.connect(addr1).mintNFT();
         //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await token.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721Token.connect(addr1).approve(contractAddress, 0);
        expect(await ERC721Token.getApproved(0)).to.equal(contractAddress);

        await token.connect(addr1).stakeNFT(0);
        //Check if state variables are getting updated correctly
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        await expect(token.connect(addr2).withdrawNFT(0)).to.be.revertedWith("Not original owner");
        expect (await token.connect(addr1).originalOwner(0)).to.equal(addr1);
        expect (await ERC721Token.ownerOf(0)).to.equal(contractAddress);
        expect (await token.connect(addr1).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
    });
});