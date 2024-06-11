// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./UniswapUtil.sol";

abstract contract UniswapLib {
    function sortPoolTokens(
        address tokenA,
        address tokenB
    ) public pure virtual returns (address token0, address token1) {
        (token0, token1) = UniswapUtil.sortPoolTokens(tokenA, tokenB);
    }

    function getTickSpacing(
        uint24 fee
    ) public pure virtual returns (int24 tickSpacing) {
        tickSpacing = UniswapUtil.getTickSpacing(fee);
    }

    function getMinMaxTick(
        uint24 fee
    ) public pure virtual returns (int24 minTick, int24 maxTick) {
        (minTick, maxTick) = UniswapUtil.getMinMaxTick(fee);
    }

    function getMinMaxSqrtPriceX96(
        uint24 fee
    ) public pure virtual returns (uint160 minSqrtPriceX96, uint160 maxSqrtPriceX96) {
        (minSqrtPriceX96, maxSqrtPriceX96) = UniswapUtil.getMinMaxSqrtPriceX96(
            fee
        );
    }

    function getRawSqrtPriceX96(
        uint256 amount0,
        uint256 amount1
    ) public pure virtual returns (uint160 rawSqrtPriceX96) {
        rawSqrtPriceX96 = UniswapUtil.getRawSqrtPriceX96(amount0, amount1);
    }

    function getSqrtPriceX96(
        uint256 amount0,
        uint256 amount1
    ) public pure virtual returns (uint160 sqrtPriceX96) {
        sqrtPriceX96 = UniswapUtil.getSqrtPriceX96(amount0, amount1);
    }

    // ======== TickMath.sol ========
    function getSqrtPriceX96AtTick(
        int24 tick
    ) public pure virtual returns (uint160 sqrtPriceX96) {
        sqrtPriceX96 = UniswapUtil.getSqrtPriceX96AtTick(tick);
    }

    function getTickAtSqrtPriceX96(
        uint160 sqrtPriceX96
    ) public pure virtual returns (int24 tick) {
        tick = UniswapUtil.getTickAtSqrtPriceX96(sqrtPriceX96);
    }

    //======== LiquidityAmounts.sol =========
    function getLiquidityForAmount0(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount0
    ) public pure virtual returns (uint128 liquidity) {
        liquidity = UniswapUtil.getLiquidityForAmount0(
            sqrtRatioAX96,
            sqrtRatioBX96,
            amount0
        );
    }

    function getLiquidityForAmount1(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount1
    ) public pure virtual returns (uint128 liquidity) {
        liquidity = UniswapUtil.getLiquidityForAmount1(
            sqrtRatioAX96,
            sqrtRatioBX96,
            amount1
        );
    }

    function getLiquidityForAmounts(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount0,
        uint256 amount1
    ) public pure virtual returns (uint128 liquidity) {
        liquidity = UniswapUtil.getLiquidityForAmounts(
            sqrtRatioX96,
            sqrtRatioAX96,
            sqrtRatioBX96,
            amount0,
            amount1
        );
    }

    function getAmount0ForLiquidity(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity
    ) public pure virtual returns (uint256 amount0) {
        amount0 = UniswapUtil.getAmount0ForLiquidity(
            sqrtRatioAX96,
            sqrtRatioBX96,
            liquidity
        );
    }

    function getAmount1ForLiquidity(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity
    ) public pure virtual returns (uint256 amount1) {
        amount1 = UniswapUtil.getAmount1ForLiquidity(
            sqrtRatioAX96,
            sqrtRatioBX96,
            liquidity
        );
    }

    function getAmountsForLiquidity(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity
    ) public pure virtual returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = UniswapUtil.getAmountsForLiquidity(
            sqrtRatioX96,
            sqrtRatioAX96,
            sqrtRatioBX96,
            liquidity
        );
    }
}
