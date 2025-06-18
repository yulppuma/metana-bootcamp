// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** 
 * @title StakeERC20Token
 * @dev Allows user to mint SERC tokens.
 */

contract StakeERC20Token is ERC20, Ownable2Step {

    constructor() ERC20("StakeERC20", "SERC") Ownable(msg.sender){}

    /**
     * @dev Mints SERC tokens.
     */
    function mint(address to, uint256 amount) external onlyOwner{
        _mint(to, amount);
    }
}