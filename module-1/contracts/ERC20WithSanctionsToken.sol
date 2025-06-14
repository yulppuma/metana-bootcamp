// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

/** 
 * @title ERC20WithSanctionsToken
 * @dev Add the ability for a centralized authority to prevent sanctioned addresses from sending or receiving the token.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20WithSanctionsToken is ERC20 {

    mapping(address => bool) public blacklist;

    mapping(address => bool) public centralizedAuthority;

    constructor() ERC20("WithSanctionsToken", "WST") {
        centralizedAuthority[msg.sender] = true;
        //minting 5000 tokens to test with
        _mint(msg.sender, 5000);
    }

    modifier onlyCentralizedAuthority(){
        require(centralizedAuthority[msg.sender], "Can't blacklist");
        _;
    }


    /**
     * @dev Adds an address to the centralized authority.
     */
    function addToCentralizedAuthority (address _newCentralizedAuthorityAddress) external onlyCentralizedAuthority{
        centralizedAuthority[_newCentralizedAuthorityAddress] = true;
    }

    /**
     * @dev Removes an address from the centralized authority.
     */
    function removeFromCentralizedAuthority (address _centralizedAuthorityAddress) external onlyCentralizedAuthority{
        centralizedAuthority[_centralizedAuthorityAddress] = false;
    }

    /**
     * @dev Adds an address to the blacklist, only centralized authority can run this function.
     */
    function addToBlacklist (address _blacklistAddress) external onlyCentralizedAuthority{
        blacklist[_blacklistAddress] = true;
    }
    /**
     * @dev Removes an address from the blacklist, only centralized authority can run this function.
     */
    function removeFromBlacklist (address _blacklistedAddress) external onlyCentralizedAuthority{
        blacklist[_blacklistedAddress] = false;
    }

    /**
     * @dev Checks that neither of the addresses are in the blacklist before updating.
     */
    function _update(address from, address to, uint256 value) internal override{
        if (blacklist[from]) revert("Blacklisted address");
        if (blacklist[to]) revert ("Blacklisted address");
        
        super._update(from, to, value);
    }
}