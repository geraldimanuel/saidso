// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockUSDC} from "./MockUSDC.sol";

/// The fuzzer calls these functions in random order with random inputs. Each one bounds its
/// inputs to something meaningful and swallows expected reverts, while ghost variables track
/// what *should* be true so the invariants below can compare.
contract Handler is Test {
    uint256 constant MARKETS = 3;

    PredictionMarket pm;
    MockUSDC usdc;
    address creator = makeAddr("creator");
    address arbiter = makeAddr("arbiter");
    address[3] bettors = [makeAddr("alice"), makeAddr("bob"), makeAddr("carol")];

    uint256 public deposited;
    uint256 public paid;
    mapping(uint256 => uint256) public paidPerMarket;
    // first final outcome seen per market (0 = not final yet); it must never change afterwards
    mapping(uint256 => PredictionMarket.Outcome) public firstFinal;
    bool public finalChanged;

    constructor(PredictionMarket _pm, MockUSDC _usdc) {
        pm = _pm;
        usdc = _usdc;
        for (uint256 i; i < MARKETS; i++) {
            vm.prank(creator);
            pm.createMarket("q", uint64(block.timestamp + (i + 1) * 1 days), arbiter);
        }
    }

    function bet(uint256 m, uint256 who, bool yes, uint256 amount) external {
        m = bound(m, 0, MARKETS - 1);
        address b = bettors[bound(who, 0, 2)];
        amount = bound(amount, 1, 1_000_000e6);
        usdc.mint(b, amount);
        vm.startPrank(b);
        usdc.approve(address(pm), amount);
        try pm.bet(m, yes, amount) {
            deposited += amount;
        } catch {}
        vm.stopPrank();
        _track();
    }

    function resolve(uint256 m, uint256 o) external {
        vm.prank(creator);
        try pm.resolve(bound(m, 0, MARKETS - 1), PredictionMarket.Outcome(bound(o, 1, 3))) {} catch {}
        _track();
    }

    function dispute(uint256 m, uint256 who) external {
        vm.prank(bettors[bound(who, 0, 2)]);
        try pm.dispute(bound(m, 0, MARKETS - 1)) {} catch {}
        _track();
    }

    function arbitrate(uint256 m, uint256 o) external {
        vm.prank(arbiter);
        try pm.arbitrate(bound(m, 0, MARKETS - 1), PredictionMarket.Outcome(bound(o, 1, 3))) {} catch {}
        _track();
    }

    function claim(uint256 m, uint256 who) external {
        m = bound(m, 0, MARKETS - 1);
        vm.prank(bettors[bound(who, 0, 2)]);
        try pm.claim(m) returns (uint256 p) {
            paid += p;
            paidPerMarket[m] += p;
        } catch {}
        _track();
    }

    /// time moves forward in jumps up to 5 days so every window gets crossed
    function warp(uint256 secs) external {
        skip(bound(secs, 0, 5 days));
        _track();
    }

    function _track() internal {
        for (uint256 i; i < MARKETS; i++) {
            PredictionMarket.Outcome o = pm.finalOutcome(i);
            if (firstFinal[i] == PredictionMarket.Outcome.Unresolved) firstFinal[i] = o;
            else if (o != firstFinal[i]) finalChanged = true;
        }
    }
}

contract PredictionMarketInvariantTest is Test {
    PredictionMarket pm;
    MockUSDC usdc;
    Handler handler;

    function setUp() public {
        usdc = new MockUSDC();
        pm = new PredictionMarket(usdc, 7 days, 24 hours, 3 days);
        handler = new Handler(pm, usdc);
        targetContract(address(handler)); // only call the handler, never the contracts directly
    }

    /// Every token the contract holds is accounted for: deposits in, payouts out, nothing else.
    function invariant_balanceMatchesBooks() public view {
        assertEq(usdc.balanceOf(address(pm)), handler.deposited() - handler.paid());
    }

    /// No market ever pays out more than was bet on it.
    function invariant_payoutsWithinPot() public view {
        for (uint256 i; i < 3; i++) {
            PredictionMarket.Market memory m = pm.getMarket(i);
            assertLe(handler.paidPerMarket(i), m.yesPool + m.noPool);
        }
    }

    /// Once a result is final (and claims may have been paid on it) it never changes.
    function invariant_finalOutcomeNeverChanges() public view {
        assertFalse(handler.finalChanged());
    }
}
