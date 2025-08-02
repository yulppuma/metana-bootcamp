// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


contract AdvancedNFT is ERC721, Ownable2Step, Multicall {
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
    BitMaps.BitMap private bitHasMinted;

    //NFT metrics
    uint256 public constant TOTAL_SUPPLY = 1000;
    uint256 public tokensMinted;

    //States variables handling commit-reveal scheme
    mapping(address => CommitDetails) public commitments;
    uint256 public constant REVEAL_BLOCK_DELAY = 10;
    uint256 public constant ANFT_PRICE = 0.1 ether;

    //Available NFT tokens
    mapping(uint256 => uint256) private availableTokenIds;
    uint256 public availableNfts = TOTAL_SUPPLY;

    //Pull pattern fund withdrawls
    mapping(address => uint256) public withdrawalAmount;

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

    modifier mintChecks(uint256 index){
        require(tokensMinted < TOTAL_SUPPLY, "All NFTs have been minted");
        require(msg.value == ANFT_PRICE, "Not enough ether");
        require (!BitMaps.get(bitHasMinted, index), "Already claimed");
        _;
    }


    /**
    * Public sale mint checks that the current state is in PublicSale.
     */
    function publicSaleMint(uint256 index, bytes32 revealHash) public payable atStage(Stages.PublicSale) mintChecks(index){
        mint(index, revealHash);
    }

    /**
    * Presale mint function checks that the current state is in Presale,
    * and the address calling the function is whitelisted.
     */
    function preSaleMint(bytes32[] calldata proof, uint256 index, bytes32 revealHash) public payable atStage(Stages.Presale) mintChecks(index){
        require(isWhitelisted(proof, msg.sender, index), "Not whitelisted");
        mint(index, revealHash);
    }

    /**
    * General mint function, after all the checks are made
    * whether the mint is in presale or public sale.
     */
    function mint (uint256 index, bytes32 revealHash) internal {
        uint256 tokenId = reveal(revealHash);
        BitMaps.setTo(bitHasMinted, index, true);
        _safeMint(msg.sender, tokenId);
        tokensMinted++;
        if (tokensMinted >= TOTAL_SUPPLY) stage = Stages.SoldOut;
    }

    /**
    * Checks if the address is whitelisted.
     */
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
    function reveal(bytes32 revealHash) internal returns(uint256){
        CommitDetails memory userCommitDetails = commitments[msg.sender];
        require(!userCommitDetails.revealed, "Already revealed");
        require(uint64(block.number) > userCommitDetails.commitBlock + 10, "Too early for reveal");
        require(uint64(block.number) <= userCommitDetails.commitBlock + 256, "Too late for reveal");
        require(getHash(revealHash) == userCommitDetails.commit, "Incorrect secret");
        
        commitments[msg.sender].revealed = true;
        //Collision prevention logic
        uint256 randomNum = uint256 (keccak256(abi.encodePacked(blockhash(userCommitDetails.commitBlock), revealHash)))%availableNfts;
        uint256 tokenId = availableTokenIds[randomNum] == 0 ? randomNum : availableTokenIds[randomNum];
        uint256 lastIndex = availableNfts - 1;
        availableTokenIds[randomNum] = availableTokenIds[lastIndex] == 0 ? lastIndex : availableTokenIds[lastIndex];
        availableNfts--;

        return tokenId;
    }

    /**
    * Designated address (owner) will pull the funds from contract
    * to corresponding receiver.
     */
    function pullFunds(address[] calldata receivers, uint256[] calldata amounts) public onlyOwner(){
        uint256 receiverCount = receivers.length;
        uint256 amountCount = amounts.length;
        uint256 totalAmount;
        require (amountCount > 0, "No amount/contributors");
        require(receiverCount == amountCount, "Length mismatch");
        for(uint256 i; i < amountCount; i++){
            totalAmount+=amounts[i];
        }
        require(address(this).balance >= totalAmount, "Insufficient balance");

        for (uint256 i; i < receiverCount; i++){
            withdrawalAmount[receivers[i]]+= amounts[i];
        }
    }

    function withdrawFunds() public{
        uint256 amount = withdrawalAmount[msg.sender];
        require (amount > 0, "Nothing to withdraw");
        require(address(this).balance >= amount, "Insufficient balance");
        withdrawalAmount[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    /**
    * Move state to the next stage, which only
    * owner can call.
     */
    function nextStage() public onlyOwner(){
        require(stage != Stages.SoldOut, "Final state");
        stage = Stages(uint(stage) + 1);
    }

    /**
    * Simple getHash function for user to submit their commit.
     */
    function getHash(bytes32 data) internal view returns (bytes32){
        return keccak256(abi.encodePacked(msg.sender, data));
    }
}