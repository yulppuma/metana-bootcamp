// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "./AddressHacks.sol";

contract AddressAttack{
    using Address for address;
    AddressHacks public addressHacks;

    constructor(AddressHacks _addressHacks){
        addressHacks = _addressHacks;
        addressHacks.protectedByIsContract();
    }

    function isContractCall() external{
        addressHacks.protectedByIsContract();
    }
}