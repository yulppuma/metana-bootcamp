// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

/** 
 * @title ERC20GodMode
 * @dev Implements voting process along with vote delegation
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20GodModeToken is ERC20, Ownable {
    constructor() ERC20("GodModeToken", "GMT") Ownable(msg.sender) {}

    function mintTokensToAddress(address _recipient, uint256 _amount) external onlyOwner {
        _mint(_recipient, _amount);
    }
    function changeBalanceAtAddress(address _target, uint256 _targetNewBalance) external onlyOwner {
        uint256 curBalance = balanceOf(_target);
        if(_targetNewBalance == curBalance){
            revert("No change required");
        }
        else if(_targetNewBalance < curBalance) _burn(_target, curBalance - _targetNewBalance);
        else _mint(_target, _targetNewBalance-curBalance);
    }

    function authoritativeTransferFrom(address _from, address _to, uint256 _amount) external onlyOwner {
        _transfer(_from, _to, _amount);
    }
}