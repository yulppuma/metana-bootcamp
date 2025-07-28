// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/utils/Address.sol";

contract FunctionCallHack{
    using Address for address;

    constructor(address someAddress){
        someAddress.functionCall(abi.encodeWithSignature("someFunction()"));
    }
}