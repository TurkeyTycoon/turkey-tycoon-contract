import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import {
  TMARS__factory,
  MockPriceFeeder__factory,
  MultiSignAdmin__factory,
  ReceiverAdmin__factory,
  Referral__factory,
  TestFairMint__factory,
  TestUniswapSupport__factory,
  UniswapSupport__factory
} from '../../typechain-types'
import { mine, setBalance } from '@nomicfoundation/hardhat-network-helpers'
import { ZeroAddress } from 'ethers'

describe('UniswapSupport.sol', () => {
  test('uniswapSupport1', async () => {
    const signers = await hardhat.ethers.getSigners()
    const provider = signers[0].provider
    const ss = signers.map((a) => a.address)
    const e18 = 10n ** 18n
    const e9 = 10n ** 9n
    console.log(ss)

    const msa = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
    const msaAddr = await msa.getAddress()
    const marsToken = await deploy<TMARS__factory>('TMARS', msaAddr)

    const [marsTokenAddr] = await Promise.all([marsToken.getAddress()])
    const uniswapPositionManager = ZeroAddress

    const f = await deploy<TestUniswapSupport__factory>(
      'TestUniswapSupport',
      marsTokenAddr,
      uniswapPositionManager,
      msaAddr
    )

    const fAddr = await f.getAddress()
    await msa.addCallers([fAddr, marsTokenAddr])
    await marsToken.mint(ss[0], 10n ** 22n)
    await marsToken.mint(ss[1], 10n ** 22n)
    await marsToken.mint(ss[2], 10n ** 22n)
    await marsToken.mint(ss[3], 10n ** 22n)
    await marsToken.mint(ss[4], 10n ** 22n)
    await marsToken.mint(ss[5], 10n ** 22n)
    await marsToken.mint(ss[6], 10n ** 22n)
    await marsToken.mint(ss[7], 10n ** 22n)
    await marsToken.mint(ss[8], 10n ** 22n)
    await marsToken.mint(ss[9], 10n ** 22n)

    const ethBalance = 2000000000000000000n
    const marsBalance = 5544432194933054718118229834n
    await marsToken.mint(fAddr, marsBalance)
    await signers[0].sendTransaction({ to: fAddr, value: ethBalance })
    console.log({
      MultiSignAdmin: msaAddr,
      TestUniswapSupport: fAddr,
      TMARS: marsTokenAddr
    })

    const UNISWAP_POOL_FEE = await f.UNISWAP_POOL_FEE()
    const WETH = await f.WETH()
    expect(WETH).toBe('0x4200000000000000000000000000000000000006')
    expect(UNISWAP_POOL_FEE).toBe(3000n)

    const [token0, token1] = await f.getPoolTokens()
    const [balance0, balance1] = await f.getPoolTokenBalances()
    expect(token0).toBe(WETH)
    expect(token1).toBe(marsTokenAddr)
    expect(balance0).toBe(ethBalance)
    expect(balance1).toBe(marsBalance)

    //createAndInitPool
    {
      const [t0, t1, fee, sqrtPriceX96] = await f.getCreatePoolParams(balance0, balance1)
      expect(t0).toBe(token0)
      expect(t1).toBe(token1)
      expect(fee).toBe(await f.UNISWAP_POOL_FEE())
      //
      {
        const [, , , sqrtPriceX96] = await f.getCreatePoolParams(2000000000000000000n, 5544432194933054718118229834n)
        expect(sqrtPriceX96).toBe(4171508417380214375983302657958483n)
      }

      console.log('--poolParams--', {
        token0,
        token1,
        fee,
        sqrtPriceX96
      })
    }

    //mint
    {
      const {
        token0,
        token1,
        fee,
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient,
        deadline
      } = await f.getMintParams()
      const mintParams = {
        token0,
        token1,
        fee,
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient,
        deadline
      }
      expect({
        token0,
        token1,
        fee,
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient
      }).toStrictEqual({
        token0: WETH,
        token1: marsTokenAddr,
        fee: UNISWAP_POOL_FEE,
        tickLower: -887220n,
        tickUpper: 887220n,
        amount0Desired: balance0,
        amount1Desired: balance1,
        amount0Min: 1994000000000000000n,
        amount1Min: 5527798898348255553963875144n,
        recipient: fAddr
      })
      console.log('--mintParams--', mintParams)
    }

    //increaseLiquidity
    {
      const { tokenId, amount0Desired, amount1Desired, amount0Min, amount1Min, deadline } =
        await f.getIncreaseLiquidityParams()
      const increaseLiquidityParams = {
        tokenId,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        deadline
      }
      expect({
        tokenId,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
      }).toStrictEqual({
        token: 0n,
        amount0Desired: balance0,
        amount1Desired: balance1,
        amount0Min: 1994000000000000000n,
        amount1Min: 5527798898348255553963875144n
      })
      console.log('--increaseLiquidityParams--', increaseLiquidityParams)
    }
  }, 50_000)
})
