// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../common/IMintableERC20.sol";
import "../multisign/MultiSignOwnable.sol";
import "../uniswap/INonfungiblePositionManager.sol";
import "../uniswap/UniswapUtil.sol";

interface IWETH9 {
    function withdraw(uint wad) external;

    function balanceOf(address account) external view returns (uint256);
}

abstract contract UniswapSupport is MultiSignOwnable {
    error UniswapPoolNotCreated();
    error UniswapPoolPositionNotCreated();
    error LiquidityLocked();

    address public constant WETH = 0x4200000000000000000000000000000000000006;
    uint24 public constant UNISWAP_POOL_FEE = 3000;
    uint256 public tokenMintAmount = 3 * 10 ** 26;
    IMintableERC20 public token;

    INonfungiblePositionManager public uniswapPositionManager;

    address public uniswapPool;
    uint256 public positionTokenId;

    constructor(
        address initialToken,
        address initialUniswapPositionManager,
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) {
        token = IMintableERC20(initialToken);
        uniswapPositionManager = INonfungiblePositionManager(
            initialUniswapPositionManager
        );
    }

    function withdrawAll(address recipient) external onlyMultiSignAuthorized {
        _withdrawAll(recipient);
    }

    function _withdrawAll(address recipient) internal {
        uint wethBalance = IWETH9(WETH).balanceOf(address(this));
        if (wethBalance > 0) {
            IWETH9(WETH).withdraw(wethBalance);
        }

        if (address(this).balance > 0) {
            payable(recipient).transfer(address(this).balance);
        }

        uint tokenBalance = token.balanceOf(address(this));
        if (tokenBalance > 0) {
            token.transfer(recipient, tokenBalance);
        }
    }

    function _getPoolTokens()
        internal
        view
        returns (address token0, address token1)
    {
        return UniswapUtil.sortPoolTokens(WETH, address(token));
    }

    function _getPoolTokenBalances()
        internal
        view
        returns (uint balance0, uint balance1)
    {
        (address token0, address token1) = _getPoolTokens();
        if (token0 == WETH) {
            balance0 = address(this).balance;
            balance1 = IMintableERC20(token1).balanceOf(address(this));
        } else if (token1 == WETH) {
            balance0 = IMintableERC20(token0).balanceOf(address(this));
            balance1 = address(this).balance;
        } else {
            balance0 = IMintableERC20(token0).balanceOf(address(this));
            balance1 = IMintableERC20(token1).balanceOf(address(this));
        }
    }

    function _getCreatePoolParams(
        uint balance0,
        uint balance1
    )
        internal
        view
        returns (
            address token0,
            address token1,
            uint24 fee,
            uint160 sqrtPriceX96
        )
    {
        (token0, token1) = _getPoolTokens();
        fee = UNISWAP_POOL_FEE;
        sqrtPriceX96 = UniswapUtil.getSqrtPriceX96(balance0, balance1);
    }

    function _getMintParams()
        internal
        view
        returns (INonfungiblePositionManager.MintParams memory)
    {
        (address token0, address token1) = _getPoolTokens();
        (int24 tickLower, int24 tickUpper) = UniswapUtil.getMinMaxTick(
            UNISWAP_POOL_FEE
        );
        (uint256 balance0, uint256 balance1) = _getPoolTokenBalances();
        return
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: UNISWAP_POOL_FEE,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: balance0,
                amount1Desired: balance1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp + 100
            });
    }

    function _getIncreaseLiquidityParams()
        internal
        view
        returns (INonfungiblePositionManager.IncreaseLiquidityParams memory)
    {
        (uint balance0, uint balance1) = _getPoolTokenBalances();
        return
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: positionTokenId,
                amount0Desired: balance0,
                amount1Desired: balance1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 100
            });
    }

    function _createPool() internal {
        token.mint(address(this), tokenMintAmount);
        token.approve(address(uniswapPositionManager), type(uint256).max);

        (uint256 balance0, uint256 balance1) = _getPoolTokenBalances();

        (
            address token0,
            address token1,
            uint24 fee,
            uint160 sqrtPriceX96
        ) = _getCreatePoolParams(balance0, balance1);

        uniswapPool = uniswapPositionManager.createAndInitializePoolIfNecessary(
                token0,
                token1,
                fee,
                sqrtPriceX96
            );
    }

    function _uniswapMint()
        internal
        returns (
            uint tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        uint eth = address(this).balance;
        (tokenId, liquidity, amount0, amount1) = uniswapPositionManager.mint{
            value: eth
        }(_getMintParams());
        positionTokenId = tokenId;
    }

    function _increaseLiquidity() internal {
        uint eth = address(this).balance;
        uniswapPositionManager.increaseLiquidity{value: eth}(
            _getIncreaseLiquidityParams()
        );
    }

    function _decreaseLiquidity() internal {
        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            //uint96 nonce
            //address operator
            //address token0
            //address token1
            //uint24 fee
            //int24 tickLower
            //int24 tickUpper
            uint128 liquidity, //uint256 feeGrowthInside0LastX128 //uint256 feeGrowthInside1LastX128 //uint128 tokensOwed0 //uint128 tokensOwed1
            ,
            ,
            ,

        ) = uniswapPositionManager.positions(positionTokenId);

        uniswapPositionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: positionTokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 100
            })
        );
    }

    function _poolRefund() internal {
        uniswapPositionManager.unwrapWETH9(0, address(this));
        uniswapPositionManager.refundETH();
        uniswapPositionManager.sweepToken(address(token), 0, address(this));

        uint wethBalance = IWETH9(WETH).balanceOf(address(this));
        if (wethBalance > 0) {
            IWETH9(WETH).withdraw(wethBalance);
        }
    }

    function _poolCollect() internal {
        uniswapPositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: positionTokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    function uniswapCollect(
        address recipient
    ) external onlyMultiSignAuthorized {
        uint ethBalance0 = address(this).balance;
        uint tokenBalance0 = token.balanceOf(address(this));

        _poolCollect();
        _poolRefund();

        uint ethBalance1 = address(this).balance;
        if (ethBalance1 > ethBalance0) {
            payable(recipient).transfer(ethBalance1 - ethBalance0);
        }

        uint tokenBalance1 = token.balanceOf(address(this));
        if (tokenBalance1 > tokenBalance0) {
            token.transfer(recipient, tokenBalance1 - tokenBalance0);
        }
    }

    function _addLiquidity() internal virtual {
        if (uniswapPool == address(0)) {
            _createPool();
        }

        if (positionTokenId == 0) {
            _uniswapMint();
        } else {
            _increaseLiquidity();
        }
        _poolRefund();
    }

    function addLiquidity() external onlyMultiSignAuthorized {
        _addLiquidity();
    }

    function setTokenMintAmount(
        uint256 newTokenMintAmount
    ) external onlyMultiSignAuthorized {
        tokenMintAmount = newTokenMintAmount;
    }

    function liquidityLocked() public view virtual returns (bool) {
        return false;
    }

    function removeLiquidity(
        address recipient
    ) external onlyMultiSignAuthorized {
        if (uniswapPool == address(0)) {
            revert UniswapPoolNotCreated();
        }
        if (positionTokenId == 0) {
            revert UniswapPoolPositionNotCreated();
        }

        if (liquidityLocked()) {
            revert LiquidityLocked();
        }

        _decreaseLiquidity();
        _poolCollect();
        _poolRefund();
        _withdrawAll(recipient);
    }

    receive() external payable {}

    fallback() external payable {}
}
