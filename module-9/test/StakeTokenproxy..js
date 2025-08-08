const { expect } = require("chai");
const { ethers } = require("hardhat");
//const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakeToken (proxy)", function () {
    let ERC20Token, ERC721Token, token, addr1, addr2;

    beforeEach(async () => {
        [addr1, addr2] = await ethers.getSigners();

        //ERC20 Contract deployed
        const ERC20TokenContract = await ethers.getContractFactory("StakeERC20TokenV1");
        ERC20Token = await upgrades.deployProxy(ERC20TokenContract, [], {initializer: 'initialize'})
        await ERC20Token.waitForDeployment();
        const ERC20Address = await ERC20Token.getAddress();

        //ERC721 Contract deployed
        const ERC721TokenContract = await ethers.getContractFactory("StakeERC721TokenV1");
        ERC721Token = await upgrades.deployProxy(ERC721TokenContract, [], {initializer: 'initialize'});
        await ERC721Token.waitForDeployment();
        const ERC721Address = await ERC721Token.getAddress();

        //Stake Contract deployed
        const Token = await ethers.getContractFactory("StakeTokenV1");
        token = await upgrades.deployProxy(Token, [ERC20Address, ERC721Address], {initializer: 'initialize'});
        await token.waitForDeployment();
        contractAddress = await token.getAddress();
    });
    
    it('should return the address of the owner (address that deployed)', async function(){
        expect(await ERC20Token.owner()).to.be.equal(addr1.address);
    });

    it('should revert if non-owner tries to mint', async function(){
        await expect(ERC20Token.connect(addr2).mint(addr1.address, 1)).to.be.revertedWithCustomError(ERC20Token, "OwnableUnauthorizedAccount");
    });

    it('should allow owner to mint ERC20 tokens', async function(){
        const mintTx = await ERC20Token.mint(addr1.address, 1);
        mintTx.wait();
        expect(await ERC20Token.balanceOf(addr1.address)).to.be.equal(1);
    });

    it('should allow user to mint NFT', async function(){
        const mintTx = await ERC721Token.mintNFT();
        mintTx.wait();
        expect(await ERC721Token.balanceOf(addr1.address)).to.be.equal(1);
    });

    it ('should let me transfer ownership to the StakeTokenV1 contract', async function(){
        const transferOwnerTx = await ERC20Token.transferOwnership(contractAddress);
        transferOwnerTx.wait();
        const acceptOwnershipTx = await token.acceptERC20ContractOwnership();
        acceptOwnershipTx.wait();
        expect(await ERC20Token.owner()).to.be.equal(contractAddress);
    });
});