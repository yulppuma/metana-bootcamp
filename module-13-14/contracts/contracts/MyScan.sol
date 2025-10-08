// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./MyPriceFeed.sol";

interface IERC20 {
    function transferFrom(address, address, uint256) external returns (bool);
}

contract MyScan {
    MyPriceFeed public immutable priceFeed;

    event PaymentStamped(
        address indexed payer,
        address indexed payee,
        address indexed asset,
        uint256 amount,
        string memo,
        address feed,
        int256 price,
        uint8 priceDecimals,
        uint256 updatedAt
    );

    constructor(MyPriceFeed _priceFeed){
        priceFeed = _priceFeed;
    }

    function sendEth(address to, address feed, string calldata memo) external payable {
        require(to != address(0), "Bad addr");
        require(msg.value > 0, "No eth sent");
        (int256 answer, uint8 decimal) = priceFeed.getDataFeed(feed);
        (bool success,) = to.call{value: msg.value}("");
        require(success, "Tx failed");
        emit PaymentStamped(msg.sender, to, address(0), msg.value, memo, feed, answer, decimal, block.timestamp);
    }

    function transferERC20(address token, address to, uint256 amount, address feed, string calldata memo) external{
        require(token != address(0) && to != address(0), "Bad addr");
        require(amount > 0, "no amount");
        (int256 answer, uint8 decimal) = priceFeed.getDataFeed(feed);
        require(IERC20(token).transferFrom(msg.sender, to, amount), "Transfer fail");
        emit PaymentStamped(msg.sender, to, token, amount, memo, feed, answer, decimal, block.timestamp);
    }
}