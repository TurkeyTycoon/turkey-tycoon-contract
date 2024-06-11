import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import {
  ERC20__factory,
  INonfungiblePositionManager,
  INonfungiblePositionManager__factory,
  TMARS__factory,
  MultiSignAdmin__factory,
  TestMultiSign__factory,
  TestUniswapSupport__factory
} from '../../typechain-types'
import { mine } from '@nomicfoundation/hardhat-network-helpers'
import { ContractTransactionReceipt, JsonRpcProvider, MaxInt256, MaxUint256, MinInt256 } from 'ethers'
import { MultiSignedEvent } from '../../typechain-types/contracts/multisign/test/TestMultiSign'
import { sqrt } from '../../lib/bigint-math'

describe('INonfungiblePositionManager.sol', () => {
  test('sqrt', () => {
    expect(sqrt(2n ** 256n)).toBe(2n ** 128n)
    expect(sqrt(192983828382823838892838282n ** 2n)).toBe(192983828382823838892838282n)
    expect(sqrt(1929838283828238939289392382898328238338838892838282n ** 2n)).toBe(
      1929838283828238939289392382898328238338838892838282n
    )
    expect(sqrt(1929838283828238939289392382898328238338838892838282n ** 2n + 7777777n)).toBe(
      1929838283828238939289392382898328238338838892838282n
    )

    expect(sqrt(9292928238293829n)).toBe(96399835n)
    expect(sqrt(929292823829n)).toBe(963998n)
  })

  test('uniswap', async () => {
    const signers = await hardhat.ethers.getSigners()
    const ss = signers.map((a) => a.address)
    const msa = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
    const msaAddr = await msa.getAddress()
    const marsToken = await deploy<TMARS__factory>('TMARS', msaAddr)

    const [marsTokenAddr] = await Promise.all([marsToken.getAddress()])
    const uniswapPositionManager = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1'
    const f = await deploy<TestUniswapSupport__factory>(
      'TestUniswapSupport',
      marsTokenAddr,
      uniswapPositionManager,
      msaAddr
    )
    const fAddr = await f.getAddress()
    await msa.addCallers([fAddr, marsTokenAddr])
    await marsToken.mint(ss[0], 10n ** 22n)
    //----------------------

    const mainProvider = new JsonRpcProvider('https://mainnet.base.org')
    type UniswapFee = 10000 | 3000 | 500 | 100

    const from = '0xd0310355169c3ac11f9a0fb8835bff8d170372bf'
    const PM_ADDR = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1'
    const WETH_ADDR = '0x4200000000000000000000000000000000000006'
    const TOKEN_ADDR = '0x5babfc2f240bc5de90eb7e19d789412db1dec402' //CIRCLE
    const [token0, token1] = await f.sortPoolTokens(WETH_ADDR, TOKEN_ADDR)
    expect(token0.toLowerCase()).toBe(WETH_ADDR.toLowerCase())
    expect(token1.toLowerCase()).toBe(TOKEN_ADDR.toLowerCase())

    const pm = INonfungiblePositionManager__factory.connect(PM_ADDR, mainProvider)
    const pi = pm.interface

    const T0 = ERC20__factory.connect(token0, mainProvider)
    const T1 = ERC20__factory.connect(token1, mainProvider)

    const ethBalance = await mainProvider.getBalance(from)
    const tokenBalance = await T1.balanceOf(from)

    const balance0 = ethBalance
    const balance1 = tokenBalance

    const tokenId = await pm.tokenOfOwnerByIndex(from, (await pm.balanceOf(from)) - 1n)

    // //0. createNewPool And mint -- testOk
    // {
    //   const fee = 3000n
    //   const sqrtPriceX96 = await f.getSqrtPriceX96(balance0, balance1)
    //   const calls: any = []

    //   calls.push(pi.encodeFunctionData('createAndInitializePoolIfNecessary', [token0, token1, fee, sqrtPriceX96]))
    //   const pool = await pm.createAndInitializePoolIfNecessary.staticCall(token0, token1, fee, sqrtPriceX96, { from })
    //   console.log({ token0, token1, fee, sqrtPriceX96, balance0, balance1, pool })

    //   //----mint---
    //   const [tickLower, tickUpper] = await f.getMinMaxTick(fee)
    //   const mintParams: INonfungiblePositionManager.MintParamsStruct = {
    //     token0,
    //     token1,
    //     fee,
    //     tickLower,
    //     tickUpper,
    //     amount0Desired: balance0,
    //     amount1Desired: balance1,
    //     amount0Min: 0n,//(balance0 * (1000_000n - fee)) / 1000_000n,
    //     amount1Min: 0n,//(balance1 * (1000_000n - fee)) / 1000_000n,
    //     recipient: from,
    //     deadline: (await mainProvider.getBlock('latest'))!.timestamp + 1000
    //   }

    //   calls.push(pi.encodeFunctionData('mint', [mintParams]))
    //   calls.push(pi.encodeFunctionData('unwrapWETH9', [0n, from]))
    //   calls.push(pi.encodeFunctionData('refundETH'))
    //   calls.push(pi.encodeFunctionData('sweepToken', [token1, 0, from]))

    //   const rs = await pm.multicall.staticCall(calls, { value: ethBalance, from })
    //   const rs2 = calls.map((c: any, i: number) => pi.decodeFunctionResult(c.slice(0, 10), rs[i]))
    //   console.log(rs2)
    // }

    // //1. mintOnly pool already exists
    // {
    //   const fee = 10000n;
    //   const sqrtPriceX96 = await f.getSqrtPriceX96(balance0, balance1)
    //   const calls: any = []

    //   calls.push(pi.encodeFunctionData('createAndInitializePoolIfNecessary', [token0, token1, fee, sqrtPriceX96]))
    //   const pool = await pm.createAndInitializePoolIfNecessary.staticCall(token0, token1, fee, sqrtPriceX96, { from })

    //   console.log({ token0, token1, fee, sqrtPriceX96, balance0, balance1 })

    //   //----mint---
    //   const [tickLower, tickUpper] = await f.getMinMaxTick(fee)
    //   const mintParams: INonfungiblePositionManager.MintParamsStruct = {
    //     token0,
    //     token1,
    //     fee,
    //     tickLower,
    //     tickUpper,
    //     amount0Desired: balance0,
    //     amount1Desired: balance1,
    //     amount0Min: 0n,//(balance0 * (1000_000n - fee)) / 1000_000n,
    //     amount1Min: 0n,
    //     recipient: from,
    //     deadline: (await mainProvider.getBlock('latest'))!.timestamp + 1000
    //   }
    //   calls.push(pi.encodeFunctionData('mint', [mintParams]))
    //   calls.push(pi.encodeFunctionData('unwrapWETH9', [0n, from]))
    //   calls.push(pi.encodeFunctionData('refundETH'))
    //   calls.push(pi.encodeFunctionData('sweepToken', [token1, 0, from]))

    //   const rs = await pm.multicall.staticCall(calls, { value: ethBalance, from })
    //   const rs2 = calls.map((c: any, i: number) => pi.decodeFunctionResult(c.slice(0, 10), rs[i]))
    //   console.log(rs2)
    // }

    // //2. increaseLiquidity pool already exists --TestOk
    // {
    //   const fee = 10000n
    //   const sqrtPriceX96 = await f.getSqrtPriceX96(balance0, balance1)
    //   const calls: any = []

    //   console.log({ token0, token1, fee, sqrtPriceX96, balance0, balance1 })
    //   const position = await pm.positions(tokenId)
    //   console.log(`--position[${tokenId}]--`, position)

    //   //----increaseLiquidity---
    //   const increaseLiquidityParams: INonfungiblePositionManager.IncreaseLiquidityParamsStruct = {
    //     tokenId,
    //     amount0Desired: balance0,
    //     amount1Desired: balance1,
    //     amount0Min: 0n, //(balance0 * (1000_000n - fee)) / 1000_000n,
    //     amount1Min: 0n,
    //     deadline: (await mainProvider.getBlock('latest'))!.timestamp + 1000
    //   }
    //   calls.push(pi.encodeFunctionData('increaseLiquidity', [increaseLiquidityParams]))
    //   calls.push(pi.encodeFunctionData('unwrapWETH9', [0n, from]))
    //   calls.push(pi.encodeFunctionData('refundETH'))
    //   calls.push(pi.encodeFunctionData('sweepToken', [token1, 0, from]))

    //   const rs = await pm.multicall.staticCall(calls, { value: ethBalance, from })
    //   const rs2 = calls.map((c: any, i: number) => pi.decodeFunctionResult(c.slice(0, 10), rs[i]))
    //   console.log(rs2)
    // }

    //3. decreaseLiquidity pool already exists
    {
      const fee = 10000n
      const sqrtPriceX96 = await f.getSqrtPriceX96(balance0, balance1)
      const calls: any = []

      console.log({tokenId, token0, token1, fee, sqrtPriceX96, balance0, balance1 })
      const position = await pm.positions(tokenId)
      console.log(`--position[${tokenId}]--`, position)

      //----decreaseLiquidity---
      const decreaseLiquidityParams: INonfungiblePositionManager.DecreaseLiquidityParamsStruct = {
        tokenId,
        liquidity: position.liquidity,
        amount0Min: 0n, //(balance0 * (1000_000n - fee)) / 1000_000n,
        amount1Min: 0n,
        deadline: (await mainProvider.getBlock('latest'))!.timestamp + 1000
      }

      const collectParams: INonfungiblePositionManager.CollectParamsStruct = {
        tokenId,
        recipient: from,
        amount0Max: 2n ** 128n - 1n,
        amount1Max: 2n ** 128n - 1n
      }

      calls.push(pi.encodeFunctionData('decreaseLiquidity', [decreaseLiquidityParams]))
      calls.push(pi.encodeFunctionData('collect', [collectParams]))
      calls.push(pi.encodeFunctionData('unwrapWETH9', [0n, from]))
      calls.push(pi.encodeFunctionData('refundETH'))
      calls.push(pi.encodeFunctionData('sweepToken', [token1, 0, from]))

      const rs = await pm.multicall.staticCall(calls, { value: ethBalance, from })
      const rs2 = calls.map((c: any, i: number) => pi.decodeFunctionResult(c.slice(0, 10), rs[i]))
      console.log(rs2)
    }
  }, 100_000)
})
