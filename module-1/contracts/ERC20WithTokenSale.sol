// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

/**
 * @title ERC20WithTokenSale
 * @dev Allows users to buy tokens for 1000 tokens per 1 ETH.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20WithTokenSale is ERC20, Ownable {
    uint256 constant MAX_TOTAL_SUPPLY = 1000000 * 1e18;
    uint256 constant TOKENS_PER_ETHER = 1000 * 1e18;

    constructor() ERC20("TokenSaleToken", "TST") Ownable(msg.sender) {}

    /**
     * @dev Creates new tokens to address calling the function. Checks if 1 ETH was sent and there 
            are available tokens to mint.
     */
    function mintSale() external payable {
        uint256 tokensToMint = (msg.value * TOKENS_PER_ETHER) / 1 ether;
        require(msg.value > 0, "Must send more than 0");
        require(
            totalSupply() + (tokensToMint) <= MAX_TOTAL_SUPPLY,
            "Max token supply reached."
        );

        _mint(msg.sender, (tokensToMint));
    }

    /**
     * @dev Withdraws specific amount from the contract to the owner. Checks if available balance.
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
    }
    /**
     * @dev Used strictly for testing, use case when minting naturally and using mintsale().
     */
    function testMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
