// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Arrays.sol";
import "./ERC1155Token.sol";

contract ForgeERC1155Token {
    using Arrays for uint256[];
    using Arrays for address[];

    uint8 public constant MINUTE_CD = 1 minutes;
    mapping(address => uint256) public lastMintTime;
    ERC1155Token immutable token;

    error CooldownActive(address user);
    error InsufficientBalanceToken3to5(address user, uint256 id1, uint256 id2);
    error InsufficientBalanceToken6(
        address user,
        uint256 id1,
        uint256 id2,
        uint256 id3
    );

    constructor(address tokenAddress) {
        token = ERC1155Token(tokenAddress);
    }

    function acceptERC1155TokenOwnership() external {
        token.acceptOwnership();
    }

    function changeURI(string memory newuri) external {
        token.setURI(newuri);
    }

    function mintToken(uint256 id, bytes memory data) external {
        _forge(msg.sender, id);
        token.mint(msg.sender, id, 1, data);
    }

    function _forge(address to, uint256 id) internal {
        uint256 balanceOf0 = token.balanceOf(to, 0);
        uint256 balanceOf1 = token.balanceOf(to, 1);
        uint256 balanceOf2 = token.balanceOf(to, 2);
        if (id <= 2) {
            if (block.timestamp < lastMintTime[to] + MINUTE_CD) {
                revert CooldownActive(to);
            }
            lastMintTime[to] = block.timestamp;
        } else if (id == 3) {
            if (balanceOf0 < 1 || balanceOf1 < 1) {
                revert InsufficientBalanceToken3to5(to, 0, 1);
            }
            token.burn(to, 0, 1);
            token.burn(to, 1, 1);
        } else if (id == 4) {
            if (balanceOf1 < 1 || balanceOf2 < 1) {
                revert InsufficientBalanceToken3to5(to, 1, 2);
            }
            token.burn(to, 1, 1);
            token.burn(to, 2, 1);
        } else if (id == 5) {
            if (balanceOf0 < 1 || balanceOf2 < 1) {
                revert InsufficientBalanceToken3to5(to, 0, 2);
            }
            token.burn(to, 0, 1);
            token.burn(to, 2, 1);
        } else {
            if (balanceOf0 < 1 || balanceOf1 < 1 || balanceOf2 < 1) {
                revert InsufficientBalanceToken6(to, 0, 1, 2);
            }
            token.burn(to, 0, 1);
            token.burn(to, 1, 1);
            token.burn(to, 2, 1);
        }
    }

    function burnToken(uint256 id) external {
        require(token.balanceOf(msg.sender, id) > 0, "Nothing to burn");
        token.burn(msg.sender, id, 1);
    }

    function tradeToken(uint256 id, uint256 targetId) external {
        require(id != targetId, "Trading for same token");
        require(id <= 2 && targetId <= 2, "Only Tokens[0-2] can be traded");
        require(token.balanceOf(msg.sender, id) > 0, "Not enough to trade");
        token.burn(msg.sender, id, 1);
        token.mint(msg.sender, targetId, 1, "");
    }
}
