// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

/**
 * @title ERC20GodMode
 * @dev Allows a address to have god-mode abilities to steal other people's funds, create tokens, and destroy tokens.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";


contract ERC20GodModeToken is ERC20, Ownable2Step {
    constructor() ERC20("GodModeToken", "GMT") Ownable(msg.sender) {}


    /**
     * @dev Allows god-mode address to mint tokens to any other address.
     */
    function mintTokensToAddress(
        address recipient,
        uint256 amount
    ) external onlyOwner {
        _mint(recipient, amount);
    }

    /**
     * @dev Allows god-mode address to mint/burn tokens from other addresses.
     */
    function changeBalanceAtAddress(
        address target,
        uint256 targetNewBalance
    ) external onlyOwner {
        uint256 curBalance = balanceOf(target);
        if (targetNewBalance == curBalance) {
            revert("No change required");
        } else if (targetNewBalance < curBalance)
            _burn(target, curBalance - targetNewBalance);
        else _mint(target, targetNewBalance - curBalance);
    }

    /**
     * @dev Allows god-mode address to transfer tokens from any address to any address.
     */
    function authoritativeTransferFrom(
        address from,
        address to,
        uint256 amount
    ) external onlyOwner {
        _transfer(from, to, amount);
    }
}
