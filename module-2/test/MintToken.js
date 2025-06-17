const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MintToken", function () {
    let ERC20Token, ERC721Token, token, addr1, addr2;

    beforeEach(async () => {
        [addr1, addr2] = await ethers.getSigners();

        //ERC20 Contract deployed
        const ERC20TokenContract = await ethers.getContractFactory("MintERC20Token");
        ERC20Token = await ERC20TokenContract.deploy();
        await ERC20Token.waitForDeployment();
        //ERC721 Contract deployed
        const ERC721TokenContract = await ethers.getContractFactory("MintERC721Token");
        ERC721Token = await ERC721TokenContract.deploy();
        await ERC721Token.waitForDeployment();
        //Mint Token Contract deployed
        const Token = await ethers.getContractFactory("MintToken");
        token = await Token.deploy(ERC20Token.getAddress(), ERC721Token.getAddress());
        await token.waitForDeployment();
        contractAddress = await token.getAddress();

    });

    it ("should allow user to mint an NFT if they have enough ERC20 tokens", async function (){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC721Token.balanceOf(addr2.address)).to.equal(0);
        await ERC20Token.connect(addr1).mint(ethers.parseUnits("1000", 18));
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1000", 18));
        await ERC20Token.connect(addr1).approve(token.getAddress(), ethers.parseUnits("10", 18));
        expect(await ERC20Token.allowance(addr1.address, contractAddress)).to.equal(ethers.parseUnits("10", 18));
        //After the user approves the NFT price, they can mint an NFT
        await token.connect(addr1).mintNFT();
        //Addr1 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        //The contract address should have received the ERC20 tokens.
        expect (await ERC20Token.balanceOf(contractAddress)).to.equal(ethers.parseUnits("10", 18));
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
    });

    it ("should allow users to mint an NFT if they have enough ERC20 tokens", async function (){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC721Token.balanceOf(addr2.address)).to.equal(0);
        //Addr1 mints ERC20 tokens.
        await ERC20Token.connect(addr1).mint(ethers.parseUnits("1000", 18));
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1000", 18));
        await ERC20Token.connect(addr1).approve(token.getAddress(), ethers.parseUnits("10", 18));
        expect(await ERC20Token.allowance(addr1.address, contractAddress)).to.equal(ethers.parseUnits("10", 18));
        //Addr2 mints ERC20 tokens.
         await ERC20Token.connect(addr2).mint(ethers.parseUnits("1000", 18));
        expect(await ERC20Token.balanceOf(addr2.address)).to.equal(ethers.parseUnits("1000", 18));
        await ERC20Token.connect(addr2).approve(token.getAddress(), ethers.parseUnits("10", 18));
        expect(await ERC20Token.allowance(addr2.address, contractAddress)).to.equal(ethers.parseUnits("10", 18))
        //After the user approves the NFT price, they can mint an NFT.
        await token.connect(addr1).mintNFT();
        await token.connect(addr2).mintNFT();
        //Addr1 & 2 should own an NFT now.
        expect (await ERC721Token.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721Token.connect(addr2).balanceOf(addr2)).to.equal(1);
        //The contract address should have received the ERC20 tokens.
        expect (await ERC20Token.balanceOf(contractAddress)).to.equal(ethers.parseUnits("20", 18));
        expect (await ERC721Token.ownerOf(0)).to.equal(addr1);
        expect (await ERC721Token.ownerOf(1)).to.equal(addr2);
    });

    it ("should not mint the NFT if the user doesn't have enough ERC20 tokens", async function (){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC721Token.balanceOf(addr2.address)).to.equal(0);
        //Even if, for whatever reason, allowance has enough to mint, Addr1 does not have enough tokens to transfer.
        await expect(token.connect(addr1).mintNFT()).to.be.revertedWith("Not enough MERC tokens.");
    });
    it ("should not mint the NFT if the contract allowance is less than NFT mint cost", async function (){
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(0);
        expect (await ERC721Token.balanceOf(addr2.address)).to.equal(0);
        await ERC20Token.connect(addr1).mint(ethers.parseUnits("1000", 18));
        expect(await ERC20Token.balanceOf(addr1.address)).to.equal(ethers.parseUnits("1000", 18));
        //Approve only 9*1e18 ERC20 tokens.
        await ERC20Token.connect(addr1).approve(token.getAddress(), ethers.parseUnits("9", 18));
        await expect(token.connect(addr1).mintNFT()).to.be.revertedWithCustomError(ERC20Token, "ERC20InsufficientAllowance");
    });
});