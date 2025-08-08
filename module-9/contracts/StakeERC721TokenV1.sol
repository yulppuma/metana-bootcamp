// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

/**
 * @title StakeERC721TokenV1
 * @dev Allows user to mint SNFT tokens.
 */

contract StakeERC721TokenV1 is Initializable, ERC721Upgradeable {
    uint256 public nextTokenId;

    function initialize() public initializer {
        __ERC721_init("StakeNFT", "SNFT");
    }

    /**
     * @dev Mints SNFT tokens.
     */
    function mintNFT() external {
        _safeMint(msg.sender, nextTokenId);
        nextTokenId++;
    }
}
