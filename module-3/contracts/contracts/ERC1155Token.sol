// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Token is ERC1155, Ownable2Step{

    uint8 public constant TOKEN_0 = 0;
    uint8 public constant TOKEN_1 = 1;
    uint8 public constant TOKEN_2 = 2;
    uint8 public constant TOKEN_3 = 3;
    uint8 public constant TOKEN_4 = 4;
    uint8 public constant TOKEN_5 = 5;
    uint8 public constant TOKEN_6 = 6;

    constructor() ERC1155("ipfs://bafybeigrqt7nn3k6pfyt5tfn3fwjced2ne4j6axae4lvoks22v5w64abzm/{id}.json") Ownable(msg.sender){}

    function setURI(string memory newuri) external onlyOwner{
        _setURI(newuri);
    }

    function mint(address to, uint256 id, uint256 value, bytes memory data) external onlyOwner{
        _mint(to, id, value, data);
    }

    function burn(address from, uint256 id, uint256 value) external onlyOwner{
        _burn(from, id, value);
    }
}