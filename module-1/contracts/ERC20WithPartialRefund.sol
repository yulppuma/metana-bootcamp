// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

/**
 * @title ERC20WithTokenSale
 * @dev Allows users to buy/sell tokens to the contract.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20WithPartialRefund is ERC20, Ownable {
    uint256 constant MAX_TOTAL_SUPPLY = 1000000 * 1e18;
    uint256 constant TOKENS_PER_ETHER = 1000 * 1e18;
    uint256 constant ETHER_PER_1000_TOKENS = 0.5 ether;

    constructor() ERC20("PartialRefundToken", "PFT") Ownable(msg.sender) {}

    receive() external payable {}

    /**
     * @dev Creates new tokens to address calling the function. Checks if more than 0 ETH was 
            sent and there are available tokens to mint.
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
    function testMint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Sells back to user, and checks if contract is allowed to transfer tokens.
     * User must approve amount, prior to calling sellBack, so contract can transfer the same amount from the user.
     */
    function sellBack(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        uint256 etherToSend = (amount * ETHER_PER_1000_TOKENS) / (1000 * 1e18);
        require(address(this).balance >= etherToSend, "Insufficient balance");

        //uint256 allowance = allowance(from, address(this));
        //require(allowance >= amount, "Not enough approved");
        bool success = this.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        _burn(address(this), amount);
        payable(msg.sender).transfer(etherToSend);
    }
}
