// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./AddressHacks.sol";

contract AddressAttack2 {
    AddressHacks public addressHacks;

    constructor(AddressHacks _addressHacks) {
        addressHacks = _addressHacks;
        // This call will revert in the constructor because msg.sender != tx.origin
        addressHacks.protectedByTxOrigin();
    }
}