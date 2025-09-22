// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

contract SoToken is ERC20, ERC20Permit, ERC20Votes, Ownable2Step {
    uint256 public availableSupply = 1_000_000e18; //1 million initial total supply (can be increased via governance)
    
    constructor(uint256 mintAmount) ERC20("SoToken", "SOT") ERC20Permit("SoToken") Ownable(msg.sender){
        _mint(msg.sender, mintAmount);
    }

    function mint(address to, uint256 amount) external onlyOwner{
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes){
        super._update(from, to, value);
    }

    function nonces(address owner) public view override (ERC20Permit, Nonces) returns(uint256){
        return super.nonces(owner);
    }
}