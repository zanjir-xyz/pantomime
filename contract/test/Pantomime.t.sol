// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Pantomime} from "../src/Counter.sol";

contract PantomimeTest is Test {
    Pantomime public pantomime;

    function setUp() public {
        pantomime = new Pantomime();
    }
}
