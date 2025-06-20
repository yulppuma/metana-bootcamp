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
    mapping (address => uint256) lastMintTime;
    ERC1155Token token;

    error CooldownActive(address user);
    error InsufficientBalanceToken3to5(address user, uint256 amount, uint256 id1, uint256 id2);
    error InsufficientBalanceToken6(address user, uint256 amount, uint256 id1, uint256 id2, uint256 id3);

    constructor(address payable tokenAddress){
        token = ERC1155Token(tokenAddress);
    }

    function mintERC1155(address to, uint256 id, uint256 value, bytes memory data) external{
        uint256[] memory ids = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        ids[0] = id;
        values[0] = value;
        _forge(to, ids, values);
        token.mint(to, id, value, data);
    }

    function mintERC1155Batch(address to, uint256[] memory ids, uint256[] memory values, bytes memory data) external{
        _forge(to, ids, values);
        token.mintBatch(to, ids, values, data);
    }

    function _forge(address to, uint256[] memory ids, uint256[] memory values) internal{
        require(ids.length == values.length, "Invalid Array Length");
        for (uint i = 0; i < ids.length; ++i){
            if (ids[i] <= 2){
                if (block.timestamp < lastMintTime[to] + MINUTE_CD) {
                    revert CooldownActive(to);
                }
                lastMintTime[to] = block.timestamp;
            }
            else if (ids[i] == 3){
                if (token.balanceOf(to, 0) < values[i] || token.balanceOf(to, 1) < values[i]){
                    revert InsufficientBalanceToken3to5(to, values[i], 0, 1);
                }
                token.burnBatch(to, _makeUintArray(0, 1), _makeUintArray(values[i], values[i]));
            }
            else if (ids[i] == 4){
                if (token.balanceOf(to, 1) < values[i] || token.balanceOf(to, 2) < values[i]){
                    revert InsufficientBalanceToken3to5(to, values[i], 1, 2);
                }
                token.burnBatch(to, _makeUintArray(1, 2), _makeUintArray(values[i], values[i]));
            }
            else if (ids[i] == 5){
                if (token.balanceOf(to, 0) < values[i] || token.balanceOf(to, 2) < values[i]){
                    revert InsufficientBalanceToken3to5(to, values[i], 0, 2);
                }
                token.burnBatch(to, _makeUintArray(0, 2), _makeUintArray(values[i], values[i]));
            }
            else{
                 if (token.balanceOf(to, 0) < values[i] || token.balanceOf(to, 1) < values[i] || token.balanceOf(to, 2) < values[i]){
                    revert InsufficientBalanceToken6(to, values[i], 0, 1, 2);
                }
                uint256[] memory tokenIds = new uint256[](3);
                tokenIds[0] = 0;
                tokenIds[1] = 1;
                tokenIds[2] = 2;
                uint256[] memory amounts = new uint256[](3);
                amounts[0] = values[i];
                amounts[1] = values[i];
                amounts[2] = values[i];
                token.burnBatch(to, tokenIds, amounts);
            }
        }
    }

    function _makeUintArray(uint256 a, uint256 b) internal pure returns (uint256[] memory arr){
        arr = new uint256[](2);
        arr[0] = a;
        arr[1] = b;
    }

    function tradeToken(address to, uint256 id, uint256 targetId, uint256 value, bytes memory data) external{
        
    }
}