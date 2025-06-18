// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** 
 * @title MintERC20Token
 * @dev Allows user to mint MERC tokens.
 */

contract MintERC20Token is ERC20 {

    constructor() ERC20("MintERC20", "MERC"){}

    receive() external payable {
        mint();
    }

    /**
     * @dev Mints MERC token.
     */
    function mint() public payable{
        require(msg.value > 0, "No ETH was sent");
        _mint(msg.sender, msg.value);
    }
}