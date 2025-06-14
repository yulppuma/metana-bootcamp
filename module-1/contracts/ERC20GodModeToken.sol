// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

/** 
 * @title ERC20GodMode
 * @dev Allows a address to have god-mode abilities to steal other people's funds, create tokens, and destroy tokens.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ERC20GodModeToken is ERC20, Ownable2Step {
    constructor() ERC20("GodModeToken", "GMT") Ownable(msg.sender){}

    /**
     * @dev Allows god-mode address to mint tokens to any other address.
     */
    function mintTokensToAddress(address _recipient, uint256 _amount) external onlyOwner {
        _mint(_recipient, _amount);
    }

    /**
     * @dev Allows god-mode address to mint/burn tokens from other addresses.
     */
    function changeBalanceAtAddress(address _target, uint256 _targetNewBalance) external onlyOwner {
        uint256 curBalance = balanceOf(_target);
        if(_targetNewBalance == curBalance){
            revert("No change required");
        }
        else if(_targetNewBalance < curBalance) _burn(_target, curBalance - _targetNewBalance);
        else _mint(_target, _targetNewBalance-curBalance);
    }

    /**
     * @dev Allows god-mode address to transfer tokens from any address to any address.
     */
    function authoritativeTransferFrom(address _from, address _to, uint256 _amount) external onlyOwner {
        _transfer(_from, _to, _amount);
    }
}