// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";



contract AdvancedNFT is ERC721 {
    using BitMaps for Bitmaps.Bitmaps;

    enum Stages {
        isMintable,
        Presale,
        PublicSale,
        SoldOut
    }

    Stages public stage = Stages.isMintable;

    bytes32 public immutable merkleRoot;
    mapping(address => bool) hasMinted;
    BitMaps.BitMap private bitHasMinted;

    uint8 tokensMinted;

    constructor(bytes32 _merkleRoot) ERC721("AdvancedNFT", "ANFT"){
        merkleRoot = _merkleRoot;
    }

    modifier atStage(Stages _stage){
        require(stage == _stage);
        _;
    }

    modifier transitionAfter(){
        _;
        nextStage();
    }

    function verifyandExecute(bytes32[] calldata proof, address userAddress, uint256 bitIndex) internal view returns (bool){
        bytes32 leaf = keccak256(abi.encodePacked(userAddress, bitIndex));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }
}