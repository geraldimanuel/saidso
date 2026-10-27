// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockUSDC} from "../test/MockUSDC.sol";

/// TOKEN=<erc20 address> forge script ... ; on anvil, leave TOKEN unset to deploy a MockUSDC.
contract Deploy is Script {
    function run() external {
        address token = vm.envOr("TOKEN", address(0));
        vm.startBroadcast();
        if (token == address(0)) {
            require(block.chainid == 31337, "set TOKEN (mock USDC is for anvil only)");
            token = address(new MockUSDC());
            console.log("MockUSDC:", token);
        }
        PredictionMarket pm = new PredictionMarket(IERC20(token));
        vm.stopBroadcast();
        console.log("PredictionMarket:", address(pm));
    }
}
