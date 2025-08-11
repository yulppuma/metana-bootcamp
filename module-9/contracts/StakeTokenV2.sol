// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "./StakeERC20TokenV1.sol";
import "./StakeERC721TokenV2.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract StakeTokenV2 is Initializable, IERC721Receiver, Ownable2StepUpgradeable {
    StakeERC20TokenV1 public token;
    StakeERC721TokenV2 public nft;
    mapping(uint256 => address) public originalOwner;
    mapping(uint256 => uint256) public tokenStakingTimestamp;

    uint256 public constant STAKE_TIME = 24 hours;
    uint256 public constant STAKE_REWARD_AMOUNT = 10 * 1e18;

    /// @custom:oz-upgrades-validate-as-initializer
    function initialize(address tokenAddress, address NFTAddress, address owner) public reinitializer(2) {
        token = StakeERC20TokenV1(tokenAddress);
        nft = StakeERC721TokenV2(NFTAddress);
        __Ownable_init(owner);
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

    /**
     * @dev Gives ownership to this contract so only StakeToken can mint.
     */
    function acceptERC721ContractOwnership() external {
        nft.acceptOwnership();
    }

    /**
    * @dev To allow god mode priveleges while still keeping the Staking contract functional
    * we must update originalOwner, so the security checks are passed.
     */
    function godModeTransfers(address from, address to, uint256 tokenId) external onlyOwner{
        if(originalOwner[tokenId] == address(0)) nft.godModeTransfer(from, to, tokenId);
        else originalOwner[tokenId] = to;
    }
}
