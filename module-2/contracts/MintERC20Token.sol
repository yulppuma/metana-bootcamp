// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** 
 * @title MintERC20Token
 * @dev Allows user to mint MERC tokens.
 */

contract MintERC20Token is ERC20 {

    constructor() ERC20("MintERC20", "MERC"){}

    /**
     * @dev Mints MERC token.
     */
    function mint(uint256 amount) external{
        _mint(msg.sender, amount);
    }
}