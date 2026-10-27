// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockUSDC} from "../test/MockUSDC.sol";

/// TOKEN=<erc20 address> forge script ... ; on anvil, leave TOKEN unset to deploy a MockUSDC.
/// Windows (seconds) default to 7 days / 24 hours / 3 days, or 10 / 2 / 5 minutes on anvil so the
/// dispute flow can be clicked through; override with RESOLVE_WINDOW, DISPUTE_WINDOW, ARBITER_WINDOW.
contract Deploy is Script {
    function run() external {
        address token = vm.envOr("TOKEN", address(0));
        bool local = block.chainid == 31337;
        uint64 resolveW = uint64(vm.envOr("RESOLVE_WINDOW", local ? 10 minutes : 7 days));
        uint64 disputeW = uint64(vm.envOr("DISPUTE_WINDOW", local ? 2 minutes : 24 hours));
        uint64 arbiterW = uint64(vm.envOr("ARBITER_WINDOW", local ? 5 minutes : 3 days));
        vm.startBroadcast();
        if (token == address(0)) {
            require(local, "set TOKEN (mock USDC is for anvil only)");
            token = address(new MockUSDC());
            console.log("MockUSDC:", token);
        }
        PredictionMarket pm = new PredictionMarket(IERC20(token), resolveW, disputeW, arbiterW);
        vm.stopBroadcast();
        console.log("PredictionMarket:", address(pm));
        console.log("windows (s): resolve / dispute / arbiter", resolveW, disputeW, arbiterW);
    }
}
