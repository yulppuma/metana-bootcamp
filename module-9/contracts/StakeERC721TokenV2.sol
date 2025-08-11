// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

/**
 * @title StakeERC721TokenV1
 * @dev Allows user to mint SNFT tokens.
 */

contract StakeERC721TokenV2 is Initializable, ERC721Upgradeable, Ownable2StepUpgradeable {
    uint256 public nextTokenId;

    function initialize(address owner) public reinitializer(2) {
        __ERC721_init("StakeNFT", "SNFT");
        __Ownable_init(owner);
    }

    /**
     * @dev Mints SNFT tokens.
     */
    function mintNFT() external {
        _safeMint(msg.sender, nextTokenId);
        nextTokenId++;
    }

    /**
    * @dev Only the stake contract can call this function.
    * Forcibly transfer NFTs between accounts.
     */
    function godModeTransfer(address from, address to, uint256 tokenId) external onlyOwner{
        _transfer(from, to, tokenId);
    }
}