// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MyPriceFeed{

    function getBatchDataFeed(address[] calldata feeds) external view returns (int256[] memory answers, uint8[] memory decimals){
        uint256 n = feeds.length;
        require(n > 0, "No price feed");
        answers = new int256[](n);
        decimals = new uint8[](n);
        unchecked {
            for (uint256 i = 0; i < n; ++i){
                (answers[i], decimals[i]) = getDataFeed(feeds[i]);
            }
        }
    }

    function getDataFeed(address tokenFeed) public view returns (int256, uint8 dec) {
        AggregatorV3Interface dataFeed = AggregatorV3Interface(tokenFeed);
        (, int256 answer, , ,) = dataFeed.latestRoundData();
        return (answer, dataFeed.decimals());
    }
}