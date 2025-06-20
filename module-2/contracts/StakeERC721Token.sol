// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/** 
 * @title StakeERC721Token
 * @dev Allows user to mint SNFT tokens.
 */

contract StakeERC721Token is ERC721 {

    uint256 public nextTokenId;

    constructor() ERC721("StakeNFT", "SNFT"){}

    /**
     * @dev Mints SNFT tokens.
     */
    function mintNFT() external{
        _safeMint(msg.sender, nextTokenId);
        nextTokenId++;
    }
}