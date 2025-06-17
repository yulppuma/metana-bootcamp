// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/** 
 * @title MintERC721Token
 * @dev Allows user to mint MNFT tokens.
 */

contract MintERC721Token is ERC721 {

    uint256 public nextTokenId;

    constructor() ERC721("MintNFT", "MNFT"){}

    /**
     * @dev Mints MNFT token.
     */
    function mintNFT(address minter) external{
        _safeMint(minter, nextTokenId);
        nextTokenId++;
    }
}