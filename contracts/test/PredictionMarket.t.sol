// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract PredictionMarketTest is Test {
    PredictionMarket pm;
    address creator = makeAddr("creator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    uint256 id;
    uint64 deadline;

    function setUp() public {
        pm = new PredictionMarket();
        deadline = uint64(block.timestamp + 1 days);
        vm.prank(creator);
        id = pm.createMarket("Will Budi be late to dinner?", deadline);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    // --- createMarket (already passing) ---

    function test_createMarket_storesFields() public view {
        PredictionMarket.Market memory m = pm.getMarket(id);
        assertEq(m.creator, creator);
        assertEq(m.deadline, deadline);
        assertEq(m.question, "Will Budi be late to dinner?");
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.Unresolved));
        assertEq(pm.marketCount(), 1);
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
        vm.prank(alice);
        pm.bet{value: 1 ether}(id, true);
        vm.prank(bob);
        pm.bet{value: 3 ether}(id, false);

        PredictionMarket.Market memory m = pm.getMarket(id);
        assertEq(m.yesPool, 1 ether);
        assertEq(m.noPool, 3 ether);
        assertEq(pm.yesStake(id, alice), 1 ether);
        assertEq(pm.noStake(id, bob), 3 ether);
        assertEq(address(pm).balance, 4 ether);
    }

    function test_bet_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit PredictionMarket.BetPlaced(id, alice, true, 1 ether);
        vm.prank(alice);
        pm.bet{value: 1 ether}(id, true);
    }

    function test_bet_revertsAfterDeadline() public {
        vm.warp(deadline);
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.BettingClosed.selector);
        pm.bet{value: 1 ether}(id, true);
    }

    function test_bet_revertsOnZero() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.ZeroAmount.selector);
        pm.bet(id, true);
    }

    function test_bet_revertsOnUnknownMarket() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.MarketNotFound.selector);
        pm.bet{value: 1 ether}(99, true);
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
        vm.prank(alice);
        pm.bet{value: 1 ether}(id, true);
        vm.prank(carol);
        pm.bet{value: 3 ether}(id, true);
        vm.prank(bob);
        pm.bet{value: 4 ether}(id, false);
        vm.warp(deadline);
    }

    function test_claim_winnersSplitPotProRata() public {
        _bets();
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Yes);

        // pot = 8 ether, yesPool = 4 ether -> every 1 ether on YES earns 2 ether
        vm.prank(alice);
        assertEq(pm.claim(id), 2 ether);
        vm.prank(carol);
        assertEq(pm.claim(id), 6 ether);
        assertEq(alice.balance, 101 ether);
        assertEq(address(pm).balance, 0);
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
        assertEq(pm.claim(id), 4 ether);
        vm.prank(alice);
        assertEq(pm.claim(id), 1 ether);
    }

    function test_claim_refundsWhenWinningSideEmpty() public {
        vm.prank(bob);
        pm.bet{value: 4 ether}(id, false);
        vm.warp(deadline);
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.Yes);
        vm.prank(bob);
        assertEq(pm.claim(id), 4 ether);
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

    function testFuzz_payoutsNeverExceedPot(uint96 a, uint96 b, uint96 c, bool aliceYes) public {
        vm.assume(a > 0 && b > 0 && c > 0);
        vm.deal(alice, a);
        vm.deal(bob, b);
        vm.deal(carol, c);
        vm.prank(alice);
        pm.bet{value: a}(id, aliceYes);
        vm.prank(bob);
        pm.bet{value: b}(id, true);
        vm.prank(carol);
        pm.bet{value: c}(id, false);
        vm.warp(deadline);
        vm.prank(creator);
        pm.resolve(id, PredictionMarket.Outcome.No);

        uint256 pot = address(pm).balance;
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
