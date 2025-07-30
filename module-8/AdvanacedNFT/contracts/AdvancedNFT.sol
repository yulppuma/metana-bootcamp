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
        uint256 commitBlock;
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

    function commit(bytes32 secret) public{
        commitments[msg.sender].commit = secret;
        commitments[msg.sender].commitBlock = block.number;
    }

    function reveal(bytes32 secret) public{

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