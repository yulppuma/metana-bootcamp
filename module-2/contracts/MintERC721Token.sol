// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
/**
 * @title MintERC721Token
 * @dev Allows user to mint MNFT tokens.
 */

contract MintERC721Token is ERC721, Ownable2Step {
    uint256 public nextTokenId;

    constructor() ERC721("MintNFT", "MNFT") Ownable(msg.sender) {}

    /**
     * @dev Mints MNFT token.
     */
    function mintNFT(address _minter) external onlyOwner {
        _safeMint(_minter, nextTokenId);
        nextTokenId++;
    }
}
