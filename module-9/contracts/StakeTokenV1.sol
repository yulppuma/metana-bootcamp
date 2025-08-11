// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "./StakeERC20TokenV1.sol";
import "./StakeERC721TokenV1.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract StakeTokenV1 is Initializable, IERC721Receiver {
    StakeERC20TokenV1 public token;
    StakeERC721TokenV1 public nft;
    mapping(uint256 => address) public originalOwner;
    mapping(uint256 => uint256) public tokenStakingTimestamp;

    uint256 public constant STAKE_TIME = 24 hours;
    uint256 public constant STAKE_REWARD_AMOUNT = 10 * 1e18;

    function initialize(address tokenAddress, address NFTAddress) public initializer {
        token = StakeERC20TokenV1(tokenAddress);
        nft = StakeERC721TokenV1(NFTAddress);
    }

    modifier originalNFTOwner(uint256 tokenId) {
        require(originalOwner[tokenId] == msg.sender, "Not original owner");
        _;
    }

    /**
     * @dev Gives ownership to this contract so only StakeToken can mint.
     */
    function acceptERC20ContractOwnership() external {
        token.acceptOwnership();
    }

    /**
     * @dev Allows this contract to receive SNFT tokens.
     */
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        require(msg.sender == address(nft), "Not ERC721 contract");
        originalOwner[tokenId] = from;
        tokenStakingTimestamp[tokenId] = block.timestamp;
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @dev Stakes user's SNFT tokens.
     */
    function stakeNFT(uint256 tokenId) external {
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner of NFT");
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        originalOwner[tokenId] = msg.sender;
        tokenStakingTimestamp[tokenId] = block.timestamp;
    }

    /**
     * @dev Claim SERC tokens based off how long their NFT has been staked.
     */
    function claimRewards(uint256 tokenId) external originalNFTOwner(tokenId) {
        uint256 lastTime = tokenStakingTimestamp[tokenId];
        require(block.timestamp >= lastTime + STAKE_TIME, "No rewards");
        uint256 intervals = _mintRewardsForElapsedTime(msg.sender, lastTime);
        tokenStakingTimestamp[tokenId] = lastTime + (intervals * STAKE_TIME);
    }

    /**
     * @dev Withdraws the user's NFT from the contract and claim any available rewards.
     */
    function withdrawNFT(uint256 tokenId) external originalNFTOwner(tokenId) {
        uint256 lastTime = tokenStakingTimestamp[tokenId];
        if (block.timestamp >= lastTime + STAKE_TIME) {
            _mintRewardsForElapsedTime(msg.sender, lastTime);
        }
        delete originalOwner[tokenId];
        delete tokenStakingTimestamp[tokenId];
        nft.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /**
     * @dev Mints rewards based on the elapsed time, and returns how many intervals have passed.
     */
    function _mintRewardsForElapsedTime(
        address owner,
        uint256 lastTime
    ) internal returns (uint256 intervals) {
        uint256 elapsedTime = block.timestamp - lastTime;
        intervals = elapsedTime / STAKE_TIME;
        token.mint(owner, (intervals * STAKE_REWARD_AMOUNT));
    }
}
