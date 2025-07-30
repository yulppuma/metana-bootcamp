// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


contract AdvancedNFT is ERC721, Ownable2Step {
    using BitMaps for Bitmaps.Bitmap;
    using Strings for uint256;

    enum Stages {
        NoMintsAllowed,
        Presale,
        PublicSale,
        SoldOut
    }

    //State Machine
    Stages public stage = Stages.NoMintsAllowed;

    //Merkle Tree and Airdrop Tracking
    bytes32 public immutable merkleRoot;
    mapping(address => bool) whitelistHasMinted;
    BitMaps.BitMap private bitHasMinted;

    //NFT metrics
    uint256 public constant TOTAL_SUPPLY = 1000;
    uint256 public tokensMinted;

    //States variables handling commit-reveal scheme
    mapping(bytes32 => CommitDetails) public commitments;
    uint256 public constant REVEAL_BLOCK_DELAY = 10;

    //Pull pattern fund withdrawls
    mapping(address => uint256) public pendingWithdrawals;

    struct CommitDetails {
        bytes32 commit;
        uint64 commitBlock;
        bool revealed;
    }

    constructor(bytes32 _merkleRoot) ERC721("AdvancedNFT", "ANFT") Ownable(msg.sender){
        merkleRoot = _merkleRoot;
    }

    modifier atStage(Stages _stage){
        require(stage == _stage, "Invalid state");
        _;
    }

    function mint() public {
        
    }
    /**
    * Simple getHash function for user to submit their commit.
     */
    function getHash(bytes32 data) public view returns (bytes32){
        return keccak256(abi.encodePacked(msg.sender, data));
    }
    
    /**
    * User must commit their random 'answer' before minting.
    * Setup for allocating nft token id randomly.
     */
    function commit(bytes32 secret) public{
        commitments[msg.sender].commit = secret;
        commitments[msg.sender].commitBlock = uint64(block.number);
    }

    /**
    * After 10 blocks, users can reveal their answer
     */
    function reveal(bytes32 revealHash) public{
        CommitDetails memory userCommitDetails = commitments[msg.sender];
        require(!userCommitDetails.revealed, "Already revealed");
        require(uint64(block.number) > userCommitDetails.commitBlock + 10, "Too early for reveal");
        require(uint64(block.number) <= userCommitDetails.commitBlock + 250, "Too late for reveal");
        require(getHash(revealHash) == userCommitDetails.commit, "Incorrect secret");
        
        bytes32 blockhash = blockhash(userCommitDetails.commitBlock);
        uint256 myNFTID = uint256 (keccak256(abi.encodePacked(blockHash, revealHash)))%TOTAL_SUPPLY;

        myNFTID = avoidCollision(myNFTID);

        commitments[msg.sender].revealed = true;

    }

    /**
    * In the case where the NFT id is already taken.
    * The next available NFT id will be allocated to user
    * and so on.
     */
    function avoidCollision(uint256 tokenId) internal returns(uint256){
        
    }

    //Verify leaf
    function isWhitelisted(bytes32[] calldata proof, address userAddress, uint256 bitIndex) public view returns (bool){
        bytes32 leaf = keccak256(abi.encodePacked(userAddress, bitIndex));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    function nextStage() internal{
        stage = Stages(uint(stage) + 1);
    }
}