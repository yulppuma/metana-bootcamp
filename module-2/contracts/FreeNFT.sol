// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title FreeNFT
 * @dev ERC721 token that can be minted for free from etherscan
 */

contract FreeNFT is ERC721 {
    using Strings for uint256;

    uint8 public constant MAX_TOTAL_SUPPLY = 10;

    uint8 public tokensMinted;

    constructor() ERC721("FreeNFT", "FNFT") {}

    /**
     * @dev Mints FNFT token.
     */
    function mintToken() public {
        require(
            tokensMinted < MAX_TOTAL_SUPPLY,
            "No more tokens can be minted"
        );
        _safeMint(msg.sender, tokensMinted);
        tokensMinted++;
    }

    /**
     * @dev When calling tokenURI() will return the appropriate ipfs link.
     */
    function _baseURI() internal pure override returns (string memory) {
        return
            "ipfs://bafybeia2vaq3n2nypbdhwqtl4h2kltsphldoydomwjh2axqgumtvi3nhgy/";
    }
}
