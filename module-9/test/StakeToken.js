const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakeToken", function () {
    let ERC20Token, ERC721Token, token, addr1, addr2;

    beforeEach(async () => {
        [addr1, addr2] = await ethers.getSigners();

        //ERC20 Contract deployed
        const ERC20TokenContract = await ethers.getContractFactory("StakeERC20TokenV1");
        ERC20Token = await upgrades.deployProxy(ERC20TokenContract, )
        await ERC20Token.waitForDeployment();

        //ERC721 Contract deployed
        const ERC721TokenContract = await ethers.getContractFactory("StakeERC721TokenV1");
        ERC721Token = await ERC721TokenContract.deploy();
        await ERC721Token.waitForDeployment();

        //Stake Contract deployed
        const Token = await ethers.getContractFactory("StakeTokenV1");
        token = await Token.deploy(ERC20Token.getAddress(), ERC721Token.getAddress());
        await token.waitForDeployment();
        contractAddress = await token.getAddress();
        await ERC20Token.transferOwnership(contractAddress);
        await token.acceptERC20ContractOwnership();
    });
    
});