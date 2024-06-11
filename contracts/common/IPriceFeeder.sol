// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IPriceFeeder {
    function latestAnswer() external view returns (int256);

    function latestTimestamp() external view returns (uint256);

    function decimals() external view returns (uint8);
}
