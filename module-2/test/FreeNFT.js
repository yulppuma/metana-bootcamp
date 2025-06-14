const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FreeNFT", function () {
    let token, owner, addr1, addr2;

    beforeEach(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("FreeNFT");
        token = await Token.deploy();
        //await token.deployed();
    });

    it("Should mint 1 NFT to an address", async () => {
        await token.connect(addr1).mintToken();
        expect(await token.tokensMinted()).to.equal(1);
        expect (await token.ownerOf(0)).to.equal(addr1.address);
        expect (await token.balanceOf(addr1.address)).to.equal(1);
        expect (await token.tokenURI(0)).to.equal("ipfs://bafybeia2vaq3n2nypbdhwqtl4h2kltsphldoydomwjh2axqgumtvi3nhgy/0");
    });

    it("Should not mint more than 10 NFTs", async () => {
        //Address 1 mints the 1st NFT
        await token.connect(addr1).mintToken();
        expect(await token.tokensMinted()).to.equal(1);
        expect (await token.ownerOf(0)).to.equal(addr1.address);
        expect (await token.balanceOf(addr1.address)).to.equal(1);

        //Address 2 mints the 2nd NFT
        await token.connect(addr2).mintToken();
        expect(await token.tokensMinted()).to.equal(2);
        console.log(addr1.address);
        expect (await token.ownerOf(1)).to.equal(addr2.address);
        expect (await token.balanceOf(addr2.address)).to.equal(1);

        //Address 1 mints the 3rd NFT
        await token.connect(addr1).mintToken();
        expect(await token.tokensMinted()).to.equal(3);
        expect (await token.ownerOf(2)).to.equal(addr1.address);
        expect (await token.balanceOf(addr1.address)).to.equal(2);

        //Address 1 mints the 4th-10th NFT
        await token.connect(addr1).mintToken();
        await token.connect(addr1).mintToken();
        await token.connect(addr1).mintToken();
        await token.connect(addr1).mintToken();
        await token.connect(addr1).mintToken();
        await token.connect(addr1).mintToken();
        await token.connect(addr1).mintToken();
        expect(await token.tokensMinted()).to.equal(10);
        expect (await token.ownerOf(9)).to.equal(addr1.address);
        expect (await token.balanceOf(addr1.address)).to.equal(9);

        await expect(token.connect(addr1).mintToken()).to.be.revertedWith("No more tokens can be minted");
    });
});