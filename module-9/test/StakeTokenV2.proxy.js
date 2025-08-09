const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakeTokenV2 (proxy)", function () {
    let ERC20Token, ERC721Token, ERC721TokenV2, token, tokenV2, addr1, addr2;

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
        const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(ERC721Address);

        //Stake Contract deployed
        const Token = await ethers.getContractFactory("StakeTokenV1");
        token = await upgrades.deployProxy(Token, [ERC20Address, ERC721Address], {initializer: 'initialize'});
        await token.waitForDeployment();
        contractAddress = await token.getAddress();

        //Upgrade ERC721 and Stake Contract
        const ERC721TokenV2Contract = await ethers.getContractFactory("StakeERC721TokenV2");
        ERC721TokenV2 = await upgrades.upgradeProxy(ERC721Address, ERC721TokenV2Contract, {
            call: {
                fn: "initialize",
                args: [addr1.address],
            },
        });
        await ERC721TokenV2.waitForDeployment();
        const ERC721TokenV2Address = await ERC721TokenV2.getAddress();
        
        const tokenV2Contract = await ethers.getContractFactory("StakeTokenV2");
        tokenV2 = await upgrades.upgradeProxy(contractAddress, tokenV2Contract, {
            call: {
                fn: "initialize",
                args: [ERC20Address, ERC721Address, addr1.address]
            },
        });
        await tokenV2.waitForDeployment();
        contractV2Address = await tokenV2.getAddress();

        //Transfer ERC20 Ownership
        const transferOwnerTx = await ERC20Token.transferOwnership(contractV2Address);
        transferOwnerTx.wait();
        const acceptOwnershipTx = await tokenV2.acceptERC20ContractOwnership();
        acceptOwnershipTx.wait();
        
        //Transfer ERC721 Ownership
        const transferOwnerTx2 = await ERC721TokenV2.connect(addr1).transferOwnership(contractV2Address);
        transferOwnerTx2.wait();
        const acceptOwnershipTx2 = await tokenV2.acceptERC721ContractOwnership();
        acceptOwnershipTx2.wait();
    });

    it ("should return the correct owner of ERC20V1, ERC721V2, and Stake contracts", async function(){
        expect(await ERC20Token.owner()).to.be.equal(contractV2Address);
        expect(await ERC721TokenV2.owner()).to.be.equal(contractV2Address);
        expect(await tokenV2.owner()).to.be.equal(addr1.address);
    });

    it ("should only let god mode address to transfer NFTs between accounts forcefully" , async function(){
        const mintTx = await ERC721TokenV2.connect(addr2).mintNFT();
        await mintTx.wait();
        expect (await ERC721TokenV2.connect(addr2).balanceOf(addr2)).to.equal(1);
        expect (await ERC721TokenV2.ownerOf(0)).to.equal(addr2);
        const godModeTransferTx = await tokenV2.connect(addr1).godModeTransfers(addr2.address, addr1.address, 0);
        await godModeTransferTx.wait();
        expect (await ERC721TokenV2.connect(addr1).balanceOf(addr1)).to.equal(1);
        expect (await ERC721TokenV2.connect(addr2).balanceOf(addr2)).to.equal(0);
        expect (await ERC721TokenV2.ownerOf(0)).to.equal(addr1);
    });

    it ("should only let god mode address to transfer NFTs between accounts forcefully, even if the NFT was staked" , async function(){
        const mintTx = await ERC721TokenV2.connect(addr2).mintNFT();
        await mintTx.wait();
        expect (await ERC721TokenV2.connect(addr2).balanceOf(addr2)).to.equal(1);
        expect (await ERC721TokenV2.ownerOf(0)).to.equal(addr2);
        
        expect (await tokenV2.connect(addr2).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await tokenV2.connect(addr2).tokenStakingTimestamp(0)).to.equal(0);
        await ERC721TokenV2.connect(addr2).approve(contractV2Address, 0);
        expect(await ERC721TokenV2.getApproved(0)).to.equal(contractV2Address);
        await tokenV2.connect(addr2).stakeNFT(0);
        expect (await tokenV2.connect(addr2).originalOwner(0)).to.equal(addr2.address);
        expect (await tokenV2.connect(addr2).tokenStakingTimestamp(0)).to.be.closeTo(await time.latest(), 2);
        expect (await ERC721TokenV2.ownerOf(0)).to.equal(contractV2Address);

        //Forcefully transfer even though NFT is currently staked
        const godModeTransferTx = await tokenV2.connect(addr1).godModeTransfers(addr2.address, addr1.address, 0);
        await godModeTransferTx.wait();

        expect (await tokenV2.connect(addr1).originalOwner(0)).to.equal(addr1.address);
        await time.increase(48*60*60);
        await tokenV2.connect(addr1).withdrawNFT(0);
         expect(await ERC20Token.balanceOf(addr1)).to.equal(ethers.parseUnits("20", 18));
        expect (await tokenV2.connect(addr1).originalOwner(0)).to.equal("0x0000000000000000000000000000000000000000");
        expect (await ERC721TokenV2.ownerOf(0)).to.equal(addr1);
        expect (await tokenV2.connect(addr1).tokenStakingTimestamp(0)).to.equal(0);
    });
});