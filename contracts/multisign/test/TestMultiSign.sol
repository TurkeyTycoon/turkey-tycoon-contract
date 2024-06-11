// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../MultiSign.sol";

contract TestMultiSign is MultiSign {
    uint public lastValue;

    constructor() {}

    function writeTest(uint value) external onlyMultiSigned {
        lastValue = value;
    }
}
