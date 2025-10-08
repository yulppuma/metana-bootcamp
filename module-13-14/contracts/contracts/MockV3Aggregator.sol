// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface AggregatorV3Interface {
  function decimals() external view returns (uint8);
  function latestRoundData() external view returns (
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
  );
}

contract MockV3Aggregator is AggregatorV3Interface {
  uint8 private _decimals;
  int256 private _answer;
  uint80 private _rid = 1;
  uint256 private _t;

  constructor(uint8 d, int256 initial) {
    _decimals = d; _answer = initial; _t = block.timestamp;
  }

  function decimals() external view returns (uint8) { return _decimals; }

  function latestRoundData() external view returns (
    uint80, int256, uint256, uint256, uint80
  ) {
    return (_rid, _answer, _t, _t, _rid);
  }

  function updateAnswer(int256 a) external { _answer = a; _rid++; _t = block.timestamp; }
}
