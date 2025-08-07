const { expect } = require("chai");
const { ethers } = require("hardhat");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

const advanceBlocks = async (count) => {
  for (let i = 0; i < count; i++) {
    await ethers.provider.send("evm_mine");
  }
};

describe("AdvancedNFT", function () {
  let AdvancedNFT, advancedNFT;
  let owner, addr1, addr2, addr3, addrs;
  let merkleTree, merkleRoot;
  let whitelist;
  let currentIndex = 3; // index 0,1,2 reserved for presale users

  before(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    whitelist = [
      [addr1.address, "0"],
      [addr2.address, "1"],
      [addr3.address, "2"]
    ];
    merkleTree = StandardMerkleTree.of(whitelist, ["address", "uint256"]);
    merkleRoot = merkleTree.root;
  });

  beforeEach(async function () {
    AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
    advancedNFT = await AdvancedNFT.deploy(merkleRoot);
    await advancedNFT.waitForDeployment();
  });

  it("should let the owner transition stages", async function () {
    await advancedNFT.nextStage();
    expect(await advancedNFT.stage()).to.equal(1);
    await advancedNFT.nextStage();
    expect(await advancedNFT.stage()).to.equal(2);
    await advancedNFT.nextStage();
    expect(await advancedNFT.stage()).to.equal(3);
    await expect(advancedNFT.nextStage()).to.be.revertedWith("Final state");
  });

  it("should revert if non-owner tries to transition stages", async function () {
    await expect(advancedNFT.connect(addr1).nextStage()).to.be.revertedWithCustomError(advancedNFT, "OwnableUnauthorizedAccount");
  });
  it("should revert pre-sale minting unless in Presale stage", async function () {
    const proof = merkleTree.getProof([addr1.address, 0]);
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes("secret1"));
    await expect(advancedNFT.preSaleMint(proof, 0, revealHash, { value: ethers.parseEther("0.1") })).to.be.revertedWith("Invalid state");
  });

  it("should revert public sale minting unless in PublicSale stage", async function () {
    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await expect(advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") })).to.be.revertedWith("Invalid state");
  });

  it("should allow a whitelisted address to mint during Presale", async function () {
    await advancedNFT.nextStage(); // Presale
    const index = 0;
    const user = addr1;
    const [addr, bitIndex] = whitelist[index];
    const proof = merkleTree.getProof([addr, bitIndex]);

    const revealHash = ethers.keccak256(ethers.toUtf8Bytes("secret1"));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    const mintTx = await advancedNFT.connect(user).preSaleMint(proof, index, revealHash, { value: ethers.parseEther("0.1") });
    const receipt = await mintTx.wait();
    const tokenId = receipt.logs[0].args.tokenId;

    expect(await advancedNFT.tokensMinted()).to.equal(1n);
    expect(await advancedNFT.ownerOf(tokenId)).to.equal(user.address); // Token ID may vary but it should be minted
  });

  it("should revert if non-whitelisted address tries to mint in Presale", async function () {
    await advancedNFT.nextStage(); // Presale

    const user = addrs[0];
    const invalidIndex = 99;
    const fakeProof = [];

    const secret = ethers.keccak256(ethers.toUtf8Bytes("nonwhitelist"));
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes("nonwhitelist"));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await expect(
      advancedNFT.connect(user).preSaleMint(fakeProof, invalidIndex, revealHash, { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("Not whitelisted");
  });

  it("should allow public minting using commit-reveal", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);
  });

  it("should revert if the user's commit has already been revealed", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await expect(advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") })).to.be.revertedWith("Already revealed");
  });

  it("should revert if the user reveals too early (before +10 blocks)", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);

    await expect(advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") })).to.be.revertedWith("Too early for reveal");
  });

  it("should revert if the user reveals too late (before +256 blocks)", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(257);

    await expect(advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") })).to.be.revertedWith("Too late for reveal");
  });

  it("should revert if the user reveal does not match what they originally used", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await expect(advancedNFT.connect(user).publicSaleMint(currentIndex++, commitHash, { value: ethers.parseEther("0.1") })).to.be.revertedWith("Incorrect secret");
  });

  it("should revert mint with incorrect ether amount", async function () {
    await advancedNFT.nextStage(); // Presale

    const index = 1;
    const user = addr2;
    const proof = merkleTree.getProof([user.address, whitelist[index][1]]);
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes("bad_eth"));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await expect(
      advancedNFT.connect(user).preSaleMint(proof, index, revealHash, { value: ethers.parseEther("0.05") })
    ).to.be.revertedWith("Not enough ether");
  });

  it("should revert if same index is used (already claimed)", async function () {
    await advancedNFT.nextStage(); // Presale

    const index = 2;
    const user = addr3;
    const proof = merkleTree.getProof([user.address, whitelist[index][1]]);

    const revealHash = ethers.keccak256(ethers.toUtf8Bytes("once"));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);
    await advancedNFT.connect(user).preSaleMint(proof, index, revealHash, { value: ethers.parseEther("0.1") });

    //2nd mint
    const revealHash2 = ethers.keccak256(ethers.toUtf8Bytes("again"));
    const commitHash2 = await advancedNFT.connect(user).getHash(revealHash2);

    await advancedNFT.connect(user).commit(commitHash2);
    await advanceBlocks(11);
    await expect(
      advancedNFT.connect(user).preSaleMint(proof, index, revealHash2, { value: ethers.parseEther("0.1") })
    ).to.be.revertedWith("Already claimed");
  });

  it("should reach SoldOut state after all tokens minted", async function () {
    await advancedNFT.nextStage(); // Presale

    //First pre-sale mint
    const user = addr1;
    const [addr, bitIndex] = whitelist[0];
    const proof = merkleTree.getProof([addr, bitIndex]);

    const revealHash = ethers.keccak256(ethers.toUtf8Bytes("secret1"));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    const mintTx = await advancedNFT.connect(user).preSaleMint(proof, 0, revealHash, { value: ethers.parseEther("0.1") });
    const receipt = await mintTx.wait();
    const tokenId = receipt.logs[0].args.tokenId;

    expect(await advancedNFT.tokensMinted()).to.equal(1n);
    expect(await advancedNFT.ownerOf(tokenId)).to.equal(user.address);

    //2nd pre sale mint
    const user2 = addr2;
    const [addr0, bitIndex1] = whitelist[1];
    const proof1 = merkleTree.getProof([addr0, bitIndex1]);

    const revealHash1 = ethers.keccak256(ethers.toUtf8Bytes("secret1"));
    const commitHash1 = await advancedNFT.connect(user2).getHash(revealHash1);

    await advancedNFT.connect(user2).commit(commitHash1);
    await advanceBlocks(11);

    const mintTx1 = await advancedNFT.connect(user2).preSaleMint(proof1, 1, revealHash1, { value: ethers.parseEther("0.1") });
    const receipt1 = await mintTx1.wait();
    const tokenId1 = receipt1.logs[0].args.tokenId;

    expect(await advancedNFT.tokensMinted()).to.equal(2);
    expect(await advancedNFT.ownerOf(tokenId1)).to.equal(user2.address);

    //3rd pre sale mint
    const user3 = addr3;
    const [addr01, bitIndex2] = whitelist[2];
    const proof2 = merkleTree.getProof([addr01, bitIndex2]);

    const revealHash2 = ethers.keccak256(ethers.toUtf8Bytes("secret1"));
    const commitHash2 = await advancedNFT.connect(user3).getHash(revealHash2);

    await advancedNFT.connect(user3).commit(commitHash2);
    await advanceBlocks(11);

    const mintTx2 = await advancedNFT.connect(user3).preSaleMint(proof2, 2, revealHash2, { value: ethers.parseEther("0.1") });
    const receipt2 = await mintTx2.wait();
    const tokenId2 = receipt2.logs[0].args.tokenId;

    expect(await advancedNFT.tokensMinted()).to.equal(3);
    expect(await advancedNFT.ownerOf(tokenId2)).to.equal(user3.address);
    

    await advancedNFT.nextStage(); // PublicSale

    for (let i = 0; i < 997; i++) {
      const user = addrs[i];
      const revealHash = ethers.keccak256(ethers.toUtf8Bytes(`seed-${i}`));
      const commitHash = await advancedNFT.connect(user).getHash(revealHash);

      await advancedNFT.connect(user).commit(commitHash);
      await advanceBlocks(11);
      await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });
    }

    expect(await advancedNFT.tokensMinted()).to.equal(1000n);
    expect(await advancedNFT.stage()).to.equal(3); // SoldOut
  });

  it("should allow owner to pull funds for respective contributors", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await advancedNFT.connect(owner).pullFunds([addr1.address],[ethers.parseEther("0.1")]);

    expect(await advancedNFT.withdrawalAmount(addr1.address)).to.equal(ethers.parseEther("0.1"));
  });

  it("should revert if non-owner tries to pull funds for respective contributors", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await expect(advancedNFT.connect(addr1).pullFunds([addr1.address],[ethers.parseEther("0.1")])).to.be.revertedWithCustomError(advancedNFT, "OwnableUnauthorizedAccount");;
  });

  it("should revert if owner doesn't pull amount greater than 0", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await expect(advancedNFT.connect(owner).pullFunds([],[])).to.be.revertedWith("No amount/contributors");
  });
  it("should revert if receivers and amounts length are different", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await expect(advancedNFT.connect(owner).pullFunds([addr1.address, addr2.address],[ethers.parseEther("0")])).to.be.revertedWith("Length mismatch");
  });

  it("should revert if owner tries to pull more funds than the smart contract has balance for", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await expect(advancedNFT.connect(owner).pullFunds([addr1.address],[ethers.parseEther("0.2")])).to.be.revertedWith("Insufficient balance");
  });

  it("should allow contributor to withdraw funds using pull method", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await advancedNFT.connect(owner).pullFunds([addr1.address],[ethers.parseEther("0.1")]);

    
    expect(await advancedNFT.withdrawalAmount(addr1.address)).to.equal(ethers.parseEther("0.1"));

    const beforeBalance = await ethers.provider.getBalance(addr1.address);
    const withdrawTx = await advancedNFT.connect(addr1).withdrawFunds();
    await withdrawTx.wait();
    const contractAddress = await advancedNFT.getAddress();
    expect (await ethers.provider.getBalance(contractAddress)).to.equal(0);
    expect(await advancedNFT.withdrawalAmount(addr1.address)).to.equal(0);
  });

  it("should revert if contributor tries to pull funds when amount is less than 0", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    const user = addrs[0];
    const revealStr = "public_secret";
    const revealHash = ethers.keccak256(ethers.toUtf8Bytes(revealStr));
    const commitHash = await advancedNFT.connect(user).getHash(revealHash);

    await advancedNFT.connect(user).commit(commitHash);
    await advanceBlocks(11);

    await advancedNFT.connect(user).publicSaleMint(currentIndex++, revealHash, { value: ethers.parseEther("0.1") });

    expect(await advancedNFT.tokensMinted()).to.equal(1n);

    await advancedNFT.connect(owner).pullFunds([addr1.address],[ethers.parseEther("0.1")]);

    
    expect(await advancedNFT.withdrawalAmount(addr1.address)).to.equal(ethers.parseEther("0.1"));

    const beforeBalance = await ethers.provider.getBalance(addr1.address);
    const withdrawTx = await advancedNFT.connect(addr1).withdrawFunds();
    await withdrawTx.wait();
    const contractAddress = await advancedNFT.getAddress();
    expect (await ethers.provider.getBalance(contractAddress)).to.equal(0);
    expect(await advancedNFT.withdrawalAmount(addr1.address)).to.equal(0);

    await expect(advancedNFT.connect(addr1).withdrawFunds()).to.be.revertedWith("Nothing to withdraw");
  });

  it("should allow multiple NFT transfers in a single multicall transaction", async function () {
    await advancedNFT.nextStage(); // Presale
    await advancedNFT.nextStage(); // PublicSale

    // User 1 mints
    const user1 = addrs[0];
    const revealStr1 = "public_secret1";
    const revealHash1 = ethers.keccak256(ethers.toUtf8Bytes(revealStr1));
    const commitHash1 = await advancedNFT.connect(user1).getHash(revealHash1);
    await advancedNFT.connect(user1).commit(commitHash1);
    await advanceBlocks(11);
    let tx = await advancedNFT.connect(user1).publicSaleMint(currentIndex++, revealHash1, { value: ethers.parseEther("0.1") });
    let receipt = await tx.wait();
    const tokenId1 = receipt.logs[0].args.tokenId;

    // User 2 mints
    const user2 = addrs[1];
    const revealStr2 = "public_secret2";
    const revealHash2 = ethers.keccak256(ethers.toUtf8Bytes(revealStr2));
    const commitHash2 = await advancedNFT.connect(user2).getHash(revealHash2);
    await advancedNFT.connect(user2).commit(commitHash2);
    await advanceBlocks(11);
    tx = await advancedNFT.connect(user2).publicSaleMint(currentIndex++, revealHash2, { value: ethers.parseEther("0.1") });
    receipt = await tx.wait();
    const tokenId2 = receipt.logs[0].args.tokenId;

    expect(await advancedNFT.tokensMinted()).to.equal(2n);

    // User1 transfers their NFT (tokenId1) to User2 via multicall
    const transfer1 = advancedNFT.interface.encodeFunctionData("transferFrom", [user1.address, user2.address, tokenId1]);
    await advancedNFT.connect(user1).multicall([transfer1]);

    expect(await advancedNFT.ownerOf(tokenId1)).to.equal(user2.address);

    // User2 now owns tokenId1 and tokenId2
    expect(await advancedNFT.ownerOf(tokenId2)).to.equal(user2.address);

    // User2 transfers both NFTs back to User1 in one multicall batch
    const transfer2 = advancedNFT.interface.encodeFunctionData("transferFrom", [user2.address, user1.address, tokenId1]);
    const transfer3 = advancedNFT.interface.encodeFunctionData("transferFrom", [user2.address, user1.address, tokenId2]);

    await advancedNFT.connect(user2).multicall([transfer2, transfer3]);

    expect(await advancedNFT.ownerOf(tokenId1)).to.equal(user1.address);
    expect(await advancedNFT.ownerOf(tokenId2)).to.equal(user1.address);
  });

  it("should NOT allow multiple mint calls batched via multicall", async function () {
    await advancedNFT.nextStage(); // Presale
    // Setup user and proof for whitelist (index 0)
    const user = addr1;
    const index = 0;
    const [addr, bitIndex] = whitelist[index];
    const proof = merkleTree.getProof([addr, bitIndex.toString()]);

    // Commit & advance blocks
    const revealStr1 = "secret1";
    const revealHash1 = ethers.keccak256(ethers.toUtf8Bytes(revealStr1));
    const commitHash1 = await advancedNFT.connect(user).getHash(revealHash1);
    await advancedNFT.connect(user).commit(commitHash1);
    await advanceBlocks(11);

    // Encode two mint calls (same user, same proof and revealHash for simplicity)
    const mintCall1 = advancedNFT.interface.encodeFunctionData("preSaleMint", [proof, index, revealHash1]);
    const mintCall2 = advancedNFT.interface.encodeFunctionData("preSaleMint", [proof, index + 1, revealHash1]); // next index

    // Attempt multicall with one tx.value == ANFT_PRICE (insufficient for two mints)
    await expect(
      advancedNFT.connect(user).multicall([mintCall1, mintCall2], { value: ethers.parseEther("0.2") })
    ).to.be.reverted; // Fails msg.value check on second mint
    
  });
});