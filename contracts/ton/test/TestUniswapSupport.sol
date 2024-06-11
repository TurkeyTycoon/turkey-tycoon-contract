// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../UniswapSupport.sol";
import "../../uniswap/UniswapLib.sol";

contract TestUniswapSupport is UniswapSupport, UniswapLib  {
     constructor(
        address initialToken,
        address initialUniswapPositionManager,
        address multiSignAdmin
    ) UniswapSupport(initialToken, initialUniswapPositionManager, multiSignAdmin) {}
}