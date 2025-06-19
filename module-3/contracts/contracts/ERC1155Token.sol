// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Token is ERC1155, Ownable2Step{

    uint256 public constant TOKEN_0 = 0;
    uint256 public constant TOKEN_1 = 1;
    uint256 public constant TOKEN_2 = 2;
    uint256 public constant TOKEN_3 = 3;
    uint256 public constant TOKEN_4 = 4;
    uint256 public constant TOKEN_5 = 5;
    uint256 public constant TOKEN_6 = 6;
    //bafybeibjt6qiqzouiobmlaa65ryuozasmvhfvgqrasqtguwijfqnmdvtui

    mapping(address => uint256) public lastMintTime;

    constructor() ERC1155("") Ownable(msg.sender){}
}