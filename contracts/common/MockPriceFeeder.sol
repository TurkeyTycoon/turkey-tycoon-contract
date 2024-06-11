// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./IPriceFeeder.sol";
import "../multisign/MultiSignOwnable.sol";

contract MockPriceFeeder is IPriceFeeder, MultiSignOwnable {
    uint8 constant public decimals = 8;
    uint public latestTimestamp =  0;
    int256 public latestAnswer = 232975653263;

    constructor(address multiSignAdmin) MultiSignOwnable(multiSignAdmin) {}

    function setAnswer(int256 newAnswer) external onlyMultiSignAuthorized {
        latestAnswer = newAnswer;
        latestTimestamp = block.timestamp;
    }
}
