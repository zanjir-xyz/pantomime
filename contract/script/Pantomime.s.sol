// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Pantomime} from "../src/Pantomime.sol";

contract PantomimeScript is Script {
    Pantomime public pantomime;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        pantomime = new Pantomime(address(this));

        vm.stopBroadcast();
    }
}
