// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** 
 * @title StakeERC20Token
 * @dev Allows user to mint SERC tokens.
 */

contract StakeERC20Token is ERC20 {

    constructor() ERC20("StakeERC20", "SERC"){}

    /**
     * @dev Mints SERC tokens.
     */
    function mint(address to, uint256 amount) external{
        _mint(to, amount);
    }
}