// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../RandomSource.sol";

contract TestRandomSource is RandomSource {
    uint public lastRandom1;
    uint public lastRandom2;

    constructor() {}

    function testUpdateRandom() external returns (uint a, uint b){
        lastRandom1 = random();
        lastRandom2 = random();
        return (lastRandom1, lastRandom2);
    }
}