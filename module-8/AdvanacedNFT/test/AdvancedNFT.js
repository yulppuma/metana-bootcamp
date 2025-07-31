const { expect } = require("chai");
const { ethers } = require("hardhat");
const { keccak256 } = require("@ethersproject/keccak256");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

// Helper function to advance the blockchain by a number of blocks
const advanceBlocks = async (count) => {
    for (let i = 0; i < count; i++) {
        await ethers.provider.send("evm_mine");
    }
};

describe("AdvancedNFT", function () {
    let AdvancedNFT;
    let advancedNFT;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;
    let merkleTree;
    let merkleRoot;

    // A list of addresses and their corresponding bit index for the presale
    const whitelist = [
        ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0"],
        ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "1"],
        ["0x90F79bf6EB2c4f870365E7856125aa3D2BEb0B9E", "2"],
        ["0x15d34AAf54267DB7D7C367839AAf71A00a2C6A65", "3"],
    ];
    //After the whitelisted addresses mint their token in the presale, we track the bit index
    let addressesMinted = [
        ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0"],
        ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "1"],
        ["0x90F79bf6EB2c4f870365E7856125aa3D2BEb0B9E", "2"],
        ["0x15d34AAf54267DB7D7C367839AAf71A00a2C6A65", "3"],
    ];
    let currentIndex = 4;

    before(async function () {
        // Generate the Merkle Tree and Root using the OpenZeppelin library
        // Note: The addresses and indices are passed as strings to the tree
        merkleTree = StandardMerkleTree.of(whitelist, ["address", "uint256"]);
        merkleRoot = merkleTree.root;
    });

    beforeEach(async function () {
        // Deploy a new contract instance before each test
        AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
        advancedNFT = await AdvancedNFT.deploy(merkleRoot);
        await advancedNFT.waitForDeployment();
        const contractAddress = await advancedNFT.getAddress();
    });

    it ("should let the owner transition stages", async function (){
        await advancedNFT.nextStage();
        expect(await advancedNFT.stage()).to.equal(1); // Stages.Presale
        await advancedNFT.nextStage();
        expect(await advancedNFT.stage()).to.equal(2); // Stages.PublicSale
        await advancedNFT.nextStage();
        expect(await advancedNFT.stage()).to.equal(3); // Stages.SoldOut
        await expect(advancedNFT.nextStage()).to.be.revertedWith("Final state");
    });
    it("Should not allow non-owners to transition stages", async function () {
        await expect(advancedNFT.connect(addr1).nextStage()).to.be.revertedWithCustomError(advancedNFT, "OwnableUnauthorizedAccount");
    });
    it("should allow a whitelisted address to mint in the Presale stage", async function (){
        await advancedNFT.nextStage();
        expect(await advancedNFT.stage()).to.equal(1); // Stages.Presale
        const proof = merkleTree.getProof(whitelist[0][0], whitelist[0][1]);
    });
});
