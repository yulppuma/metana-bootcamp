// SPDX-License-Identifier: MIT

pragma solidity 0.8.30;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * @title StakeERC20TokenV1
 * @dev Allows user to mint SERC tokens.
 */

contract StakeERC20TokenV1 is Initializable, ERC20Upgradeable, Ownable2StepUpgradeable {
    
    function initialize() public initializer {
        __ERC20_init("StakeERC20", "SERC");
        __Ownable_init(msg.sender);
    }
    
    /**
     * @dev Mints SERC tokens.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
