// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


contract AdvancedNFT is ERC721, Ownable2Step {
    using BitMaps for BitMaps.BitMap;
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
    mapping(address => CommitDetails) public commitments;
    uint256 public constant REVEAL_BLOCK_DELAY = 10;
    uint256 public constant ANFT_PRICE = 0.1 ether;

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

    function publicSaleMint(uint256 index, bytes32 revealHash) public payable atStage(Stages.PublicSale) {
        require(msg.value == ANFT_PRICE, "Not enough ether");
        require (!BitMaps.get(bitHasMinted, index), "Already claimed");
        mint(index, revealHash);
    }

    function preSaleMint(bytes32[] calldata proof, uint256 index, bytes32 revealHash) public payable atStage(Stages.Presale){
        require(msg.value == ANFT_PRICE, "Not enough ether");
        require (!BitMaps.get(bitHasMinted, index), "Already claimed");
        require(isWhitelisted(proof, msg.sender, index), "Not whitelisted");
        mint(index, revealHash);
    }

    function mint (uint256 index, bytes32 revealHash) internal {
        uint256 tokenId = reveal(revealHash);
        BitMaps.setTo(bitHasMinted, index, true);
        _safeMint(msg.sender, tokenId);
    }

    //Verify leaf
    function isWhitelisted(bytes32[] calldata proof, address userAddress, uint256 bitIndex) internal view returns (bool){
        bytes32 leaf = keccak256(abi.encodePacked(userAddress, bitIndex));
        return MerkleProof.verify(proof, merkleRoot, leaf);
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
    function reveal(bytes32 revealHash) public returns(uint256){
        CommitDetails memory userCommitDetails = commitments[msg.sender];
        require(!userCommitDetails.revealed, "Already revealed");
        require(uint64(block.number) > userCommitDetails.commitBlock + 10, "Too early for reveal");
        require(uint64(block.number) <= userCommitDetails.commitBlock + 250, "Too late for reveal");
        require(getHash(revealHash) == userCommitDetails.commit, "Incorrect secret");
        
        commitments[msg.sender].revealed = true;
        uint256 myNFTID = uint256 (keccak256(abi.encodePacked(blockhash(userCommitDetails.commitBlock), revealHash)))%TOTAL_SUPPLY;

        if (_ownerOf(myNFTID) != address(0)) myNFTID = avoidCollision(myNFTID);

        return myNFTID;
    }

    /**
    * In the case where the NFT id is already taken.
    * The next available NFT id will be allocated to user
    * and so on.
     */
    function avoidCollision(uint256 tokenId) internal view returns(uint256){
        for(uint256 i; i < TOTAL_SUPPLY; i++){
            if(tokenId < TOTAL_SUPPLY - 1) tokenId++;
            else tokenId = 0;

            if(_ownerOf(tokenId) == address(0)) return tokenId;
        }
        revert("No available NFTs");
    }

    function nextStage() internal{
        stage = Stages(uint(stage) + 1);
    }

    /**
    * Simple getHash function for user to submit their commit.
     */
    function getHash(bytes32 data) public view returns (bytes32){
        return keccak256(abi.encodePacked(msg.sender, data));
    }
}