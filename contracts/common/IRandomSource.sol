// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IRandomSource {
    function random() external returns (uint);
}