// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MyPriceFeed{

    constructor(){}

    function getChainlinkDataFeedLatestAnswer(address tokenFeed) public view returns (int256) {
        AggregatorV3Interface dataFeed = AggregatorV3Interface(tokenFeed);
        (, int256 answer, , ,) = dataFeed.latestRoundData();
        return answer;
    }
}