// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/utils/Address.sol";

contract AddressHacks{
    using Address for address;

    constructor(){}

    function someFunction() public pure returns(bool){
        //Malicious code
        
    }
}