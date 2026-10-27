// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        PredictionMarket pm = new PredictionMarket();
        vm.stopBroadcast();
        console.log("PredictionMarket:", address(pm));
    }
}
