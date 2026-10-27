// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract PredictionMarketTest is Test {
    uint256 constant USDC = 1e6; // 1 USDC in base units (6 decimals)

    MockUSDC usdc;
    PredictionMarket pm;
    address creator = makeAddr("creator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    uint256 id;
    uint64 deadline;

    function setUp() public {
        usdc = new MockUSDC();
        pm = new PredictionMarket(usdc);
        deadline = uint64(block.timestamp + 1 days);
        vm.prank(creator);
        id = pm.createMarket("Will Budi be late to dinner?", deadline);
        usdc.mint(alice, 100 * USDC);
        usdc.mint(bob, 100 * USDC);
        usdc.mint(carol, 100 * USDC);
    }

    /// approve + bet, the two-step flow every ERC-20 deposit needs
    function _bet(address who, bool yes, uint256 amount) internal {
        vm.startPrank(who);
        usdc.approve(address(pm), amount);
        pm.bet(id, yes, amount);
        vm.stopPrank();
    }

    // --- createMarket ---

    function test_createMarket_storesFields() public view {
        PredictionMarket.Market memory m = pm.getMarket(id);
        assertEq(m.creator, creator);
        assertEq(m.deadline, deadline);
        assertEq(m.question, "Will Budi be late to dinner?");
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.Unresolved));
        assertEq(pm.marketCount(), 1);
        assertEq(address(pm.token()), address(usdc));
    }

    function test_createMarket_revertsOnPastDeadline() public {
        vm.expectRevert(PredictionMarket.DeadlineInPast.selector);
        pm.createMarket("q", uint64(block.timestamp));
    }

    function test_createMarket_revertsOnEmptyQuestion() public {
        vm.expectRevert(PredictionMarket.EmptyQuestion.selector);
        pm.createMarket("", deadline);
    }

    // --- bet ---

    function test_bet_updatesPoolsAndStakes() public {
        _bet(alice, true, 1 * USDC);
        _bet(bob, false, 3 * USDC);

        PredictionMarket.Market memory m = pm.getMarket(id);
        assertEq(m.yesPool, 1 * USDC);
        assertEq(m.noPool, 3 * USDC);
        assertEq(pm.yesStake(id, alice), 1 * USDC);
        assertEq(pm.noStake(id, bob), 3 * USDC);
    }

    function test_bet_pullsTokensIntoContract() public {
        _bet(alice, true, 5 * USDC);
        assertEq(usdc.balanceOf(address(pm)), 5 * USDC);
        assertEq(usdc.balanceOf(alice), 95 * USDC);
    }

    function test_bet_revertsWithoutApproval() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(pm), 0, 1 * USDC)
        );
        pm.bet(id, true, 1 * USDC);
    }

    function test_bet_revertsWithoutBalance() public {
        address broke = makeAddr("broke");
        vm.startPrank(broke);
        usdc.approve(address(pm), 1 * USDC);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, broke, 0, 1 * USDC));
        pm.bet(id, true, 1 * USDC);
        vm.stopPrank();
    }

    function test_bet_emitsEvent() public {
        vm.prank(alice);
        usdc.approve(address(pm), 1 * USDC);
        vm.expectEmit(true, true, false, true);
        emit PredictionMarket.BetPlaced(id, alice, true, 1 * USDC);
        vm.prank(alice);
        pm.bet(id, true, 1 * USDC);
    }

    function test_bet_revertsAfterDeadline() public {
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.BettingClosed.selector);
        pm.bet(id, true, 1 * USDC);
    }

    function test_bet_revertsOnZero() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.ZeroAmount.selector);
        pm.bet(id, true, 0);
    }

    function test_bet_revertsOnUnknownMarket() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.MarketNotFound.selector);
        pm.bet(99, true, 1 * USDC);
    }

    // --- resolve ---

    function test_resolve_onlyCreator() public {
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.NotCreator.selector);
        pm.resolve(id, PredictionMarket.Outcome.Yes);
    }

    function test_resolve_revertsBeforeDeadline() public {
        vm.prank(creator);
        vm.expectRevert(PredictionMarket.TooEarly.selector);
        pm.resolve(id, PredictionMarket.Outcome.Yes);
    }

    function test_resolve_revertsTwice() public {
        vm.warp(deadline);
        vm.startPrank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Yes);
        vm.expectRevert(PredictionMarket.AlreadyResolved.selector);
        pm.resolve(id, PredictionMarket.Outcome.No);
    }

    function test_resolve_revertsOnUnresolvedOutcome() public {
        vm.warp(deadline);
        vm.prank(creator);
        vm.expectRevert(PredictionMarket.InvalidOutcome.selector);
        pm.resolve(id, PredictionMarket.Outcome.Unresolved);
    }

    // --- claim ---

    function _bets() internal {
        _bet(alice, true, 1 * USDC);
        _bet(carol, true, 3 * USDC);
        _bet(bob, false, 4 * USDC);
        vm.warp(deadline);
    }

    function test_claim_winnersSplitPotProRata() public {
        _bets();
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Yes);

        // pot = 8 USDC, yesPool = 4 USDC -> every 1 USDC on YES earns 2 USDC
        vm.prank(alice);
        assertEq(pm.claim(id), 2 * USDC);
        vm.prank(carol);
        assertEq(pm.claim(id), 6 * USDC);
        assertEq(usdc.balanceOf(alice), 101 * USDC);
        assertEq(usdc.balanceOf(address(pm)), 0);
    }

    function test_claim_loserGetsNothing() public {
        _bets();
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Yes);
        vm.prank(bob);
        vm.expectRevert(PredictionMarket.NothingToClaim.selector);
        pm.claim(id);
    }

    function test_claim_invalidRefundsEveryone() public {
        _bets();
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Invalid);
        vm.prank(bob);
        assertEq(pm.claim(id), 4 * USDC);
        vm.prank(alice);
        assertEq(pm.claim(id), 1 * USDC);
    }

    function test_claim_refundsWhenWinningSideEmpty() public {
        _bet(bob, false, 4 * USDC);
        vm.warp(deadline);
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Yes);
        vm.prank(bob);
        assertEq(pm.claim(id), 4 * USDC);
    }

    function test_claim_revertsTwice() public {
        _bets();
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Yes);
        vm.startPrank(alice);
        pm.claim(id);
        vm.expectRevert(PredictionMarket.AlreadyClaimed.selector);
        pm.claim(id);
    }

    function test_claim_revertsBeforeResolve() public {
        _bets();
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.NotResolved.selector);
        pm.claim(id);
    }

    // --- fuzz: payouts never exceed what was deposited ---

    function testFuzz_payoutsNeverExceedPot(uint64 a, uint64 b, uint64 c, bool aliceYes) public {
        vm.assume(a > 0 && b > 0 && c > 0);
        usdc.mint(alice, a);
        usdc.mint(bob, b);
        usdc.mint(carol, c);
        uint256 before = usdc.balanceOf(address(pm));
        _bet(alice, aliceYes, a);
        _bet(bob, true, b);
        _bet(carol, false, c);
        vm.warp(deadline);
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.No);

        uint256 pot = usdc.balanceOf(address(pm)) - before;
        uint256 paid;
        address[3] memory users = [alice, bob, carol];
        for (uint256 i; i < 3; i++) {
            vm.prank(users[i]);
            try pm.claim(id) returns (uint256 p) {
                paid += p;
            } catch {}
        }
        assertLe(paid, pot);
        assertLt(pot - paid, 3); // rounding dust only
    }
}
