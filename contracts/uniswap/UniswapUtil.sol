// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./lib/TickMath.sol";
import "./lib/Tick.sol";
import "./lib/LiquidityAmounts.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

library UniswapUtil {
    error InvalidFee();

    function sortPoolTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
    }

    function getTickSpacing(
        uint24 fee
    ) internal pure returns (int24 tickSpacing) {
        if (fee == 100) {
            tickSpacing = 1;
        } else if (fee == 500) {
            tickSpacing = 10;
        } else if (fee == 3000) {
            tickSpacing = 60;
        } else if (fee == 10000) {
            tickSpacing = 200;
        } else {
            revert InvalidFee();
        }
    }

    function getMinMaxTick(
        uint24 fee
    ) internal pure returns (int24 minTick, int24 maxTick) {
        int24 tickSpacing = getTickSpacing(fee);
        minTick = (TickMath.MIN_TICK / tickSpacing) * tickSpacing;
        maxTick = (TickMath.MAX_TICK / tickSpacing) * tickSpacing;

        minTick = minTick >= TickMath.MIN_TICK
            ? minTick
            : minTick + tickSpacing;
        maxTick = maxTick <= TickMath.MAX_TICK
            ? maxTick
            : maxTick - tickSpacing;
    }

    function getMinMaxSqrtPriceX96(
        uint24 fee
    ) internal pure returns (uint160 minSqrtPriceX96, uint160 maxSqrtPriceX96) {
        (int24 minTick, int24 maxTick) = getMinMaxTick(fee);
        minSqrtPriceX96 = getSqrtPriceX96AtTick(minTick);
        maxSqrtPriceX96 = getSqrtPriceX96AtTick(maxTick);
    }

    function getRawSqrtPriceX96(
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (uint160 rawSqrtPriceX96) {
        rawSqrtPriceX96 = uint160(
            Math.sqrt((amount1 * 2 ** 128) / amount0) * 2 ** 32
        );
    }

    function getSqrtPriceX96(
        uint256 amount0,
        uint256 amount1
    ) internal pure returns (uint160 sqrtPriceX96) {
        sqrtPriceX96 = getSqrtPriceX96AtTick(
            getTickAtSqrtPriceX96(getRawSqrtPriceX96(amount0, amount1))
        );
    }

    // ======== TickMath.sol ========
    function getSqrtPriceX96AtTick(
        int24 tick
    ) internal pure returns (uint160 sqrtPriceX96) {
        sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
    }

    function getTickAtSqrtPriceX96(
        uint160 sqrtPriceX96
    ) internal pure returns (int24 tick) {
        tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    }

    //======== LiquidityAmounts.sol =========
    function getLiquidityForAmount0(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount0
    ) internal pure returns (uint128 liquidity) {
        liquidity = LiquidityAmounts.getLiquidityForAmount0(
            sqrtRatioAX96,
            sqrtRatioBX96,
            amount0
        );
    }

    function getLiquidityForAmount1(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount1
    ) internal pure returns (uint128 liquidity) {
        liquidity = LiquidityAmounts.getLiquidityForAmount1(
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
    ) internal pure returns (uint128 liquidity) {
        liquidity = LiquidityAmounts.getLiquidityForAmounts(
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
    ) internal pure returns (uint256 amount0) {
        amount0 = LiquidityAmounts.getAmount0ForLiquidity(
            sqrtRatioAX96,
            sqrtRatioBX96,
            liquidity
        );
    }

    function getAmount1ForLiquidity(
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity
    ) internal pure returns (uint256 amount1) {
        amount1 = LiquidityAmounts.getAmount1ForLiquidity(
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
    ) internal pure returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            sqrtRatioAX96,
            sqrtRatioBX96,
            liquidity
        );
    }
}
