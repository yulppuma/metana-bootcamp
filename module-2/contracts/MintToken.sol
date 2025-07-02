// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MintERC721Token.sol";

/**
 * @title MintToken
 * @dev Allows user to mint MNFT tokens with MERC tokens.
 */

contract MintToken {
    IERC20 public token;
    MintERC721Token public nft;
    uint256 public constant NFT_PRICE = 10 * 1e18;

    constructor(address tokenAddress, address NFTAddress) {
        token = IERC20(tokenAddress);
        nft = MintERC721Token(NFTAddress);
    }

    function acceptNFTContractOwnership() external {
        nft.acceptOwnership();
    }

    /**
     * @dev Mints ERC721 token with ERC20 token as payment.
     */
    function mintNFT() external {
        require(
            token.balanceOf(msg.sender) >= NFT_PRICE,
            "Not enough MERC tokens."
        );
        token.transferFrom(msg.sender, address(this), NFT_PRICE);
        nft.mintNFT(msg.sender);
    }
}
