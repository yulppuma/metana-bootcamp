// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/** 
 * @title FreeNFT
 * @dev ERC721 token that can be minted for free from etherscan
 */

 contract FreeNft is ERC721{

    using Strings for uint256;

     uint8 public constant MAX_TOTAL_SUPPLY = 10;

     uint8 public tokensMinted;

     string public baseURL = "https://myfreenft.com/images/";

    constructor() ERC721("FreeNFT","FNFT"){}

    function mintToken() public{
        require(tokensMinted < MAX_TOTAL_SUPPLY, "No more tokens can be minted");
        _safeMint(msg.sender, tokensMinted);
        tokensMinted++;
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory){
        address owner = _ownerOf(_tokenId);
        require(owner != address(0), "Not valid");
        return string(abi.encodePacked(baseURL, _tokenId.toString(), ".jpeg"));
    }
 }