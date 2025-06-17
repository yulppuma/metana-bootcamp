// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "./StakeERC20Token.sol";
import "./StakeERC721Token.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract StakeToken is IERC721Receiver{
    StakeERC20Token public token;
    IERC721 public nft;
    mapping(uint256 => address) public originalOwner;
    mapping(uint256 => uint256) public tokenStakingTimestamp;

    uint256 public constant RETURN_RATE = 24 hours;
    uint256 public constant REWARD_AMOUNT = 10 * 1e18;

    constructor(address tokenAddress, address NFTAddress){
        token = StakeERC20Token(tokenAddress);
        nft = IERC721(NFTAddress);
    }

    /**
     * @dev Allows this contract to receive SNFT tokens.
     */
    function onERC721Received(address , address , uint256 , bytes calldata ) external pure override returns (bytes4){
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @dev Stakes user's SNFT tokens.
     */
    function stakeNFT(uint256 tokenId) external{
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner of NFT");
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        originalOwner[tokenId] = msg.sender;
        tokenStakingTimestamp[tokenId] = block.timestamp;
    }

    /**
     * @dev Claim SERC tokens based off how long their NFT has been staked.
     */
    function claimRewards(uint256 tokenId) external {
        require(originalOwner[tokenId] == msg.sender, "Not original staker");
        uint256 lastTime = tokenStakingTimestamp[tokenId];
        require(block.timestamp >= lastTime + RETURN_RATE, "No rewards");
        uint256 timeElapsed = block.timestamp - lastTime;
        uint256 rewards = timeElapsed / RETURN_RATE;
        tokenStakingTimestamp[tokenId] = lastTime + (rewards * RETURN_RATE);
        token.mint(msg.sender, (rewards * REWARD_AMOUNT));
    }

    /**
     * @dev Withdraws the user's NFT from the contract and claim any available rewards.
     */
    function withdrawNFT(uint256 tokenId) external{
        require(originalOwner[tokenId] == msg.sender, "Not original owner");
        uint256 lastTime = tokenStakingTimestamp[tokenId];
        if(block.timestamp >= lastTime + RETURN_RATE){
            uint256 timeElapsed = block.timestamp - lastTime;
            token.mint(msg.sender, (timeElapsed / RETURN_RATE) * REWARD_AMOUNT);
        }
        delete originalOwner[tokenId];
        delete tokenStakingTimestamp[tokenId];
        nft.safeTransferFrom(address(this), msg.sender, tokenId);
    }
}