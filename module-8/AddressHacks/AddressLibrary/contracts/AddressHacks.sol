// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/utils/Address.sol";

contract AddressHacks{
    using Address for address;
    
    bool public accessed;

    function protectedByIsContract() public{
        //Malicious code
        require(!msg.sender.isContract(), "Contracts not allowed");
        accessed = true;
    }

    function protectedByTxOrigin() external {
        require(msg.sender == tx.origin, "No proxy/contract calls");
        accessed = true;
    }

    function isAccessedFalse() public{
        accessed = false;
    }
}