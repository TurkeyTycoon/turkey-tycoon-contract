import hardhat from 'hardhat'
import { deploy } from '../../lib/deploy-utils'
import {
  Airdrop__factory,
  TMARS__factory,
  MockPriceFeeder__factory,
  MultiSignAdmin__factory,
  ReceiverAdmin__factory,
  Referral__factory,
  TestFairMint__factory
} from '../../typechain-types'
import { mine, setBalance } from '@nomicfoundation/hardhat-network-helpers'
import { TypedDataDomain, ZeroAddress, verifyTypedData } from 'ethers'

describe('Airdrop.sol', () => {
  test('airdrop', async () => {
    const signers = await hardhat.ethers.getSigners()
    const provider = signers[0].provider
    const ss = signers.map((a) => a.address)
    const e18 = 10n ** 18n
    const e9 = 10n ** 9n
    console.log(ss)

    const msa = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
    const msaAddr = await msa.getAddress()
    const referral = await deploy<Referral__factory>('Referral', msaAddr)
    const marsToken = await deploy<TMARS__factory>('TMARS', msaAddr)
    const priceFeeder = await deploy<MockPriceFeeder__factory>('MockPriceFeeder', msaAddr)
    const ethReceiverAdmin = await deploy<ReceiverAdmin__factory>('ReceiverAdmin', msaAddr)

    const [referralAddr, marsTokenAddr, priceFeederAddr, receiverAdminAddr] = await Promise.all([
      referral.getAddress(),
      marsToken.getAddress(),
      priceFeeder.getAddress(),
      ethReceiverAdmin.getAddress()
    ])
    const uniswapPositionManager = ZeroAddress

    const f = await deploy<TestFairMint__factory>(
      'TestFairMint',
      marsTokenAddr,
      priceFeederAddr,
      receiverAdminAddr,
      uniswapPositionManager,
      msaAddr
    )

    const fAddr = await f.getAddress()
    const airdrop = await deploy<Airdrop__factory>('Airdrop', fAddr, msaAddr)
    const airdropAddr = await airdrop.getAddress()

    const f0 = f.connect(signers[0])
    const f2 = f.connect(signers[2])
    const f1 = f.connect(signers[1])
    const f4 = f.connect(signers[4])
    const f9 = f.connect(signers[9])
    const maxMintSupply = await f4.maxMintSupply()

    const a0 = airdrop.connect(signers[0])
    const a1 = airdrop.connect(signers[1])
    const a2 = airdrop.connect(signers[2])
    const a4 = airdrop.connect(signers[4])
    const a8 = airdrop.connect(signers[8])
    const a5 = airdrop.connect(signers[5])

    //CallerNotInList
    {
      await expect(() => marsToken.mint(ss[1], e18)).rejects.toThrow('CallerNotInList')
      await expect(() => marsToken.addAdmin(fAddr)).rejects.toThrow('CallerNotInList')
      await expect(() => marsToken.removeAdmin(fAddr)).rejects.toThrow('CallerNotInList')
      await expect(() => priceFeeder.setAnswer(2000n * 10n ** 8n)).rejects.toThrow('CallerNotInList')
      await expect(() => ethReceiverAdmin.addReceivers([ss[0], ss[1]])).rejects.toThrow('CallerNotInList')
      await expect(() => ethReceiverAdmin.removeReceiver(ss[1])).rejects.toThrow('CallerNotInList')

      await expect(() => f.setReferral(referralAddr)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setLevel1RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setLevel2RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setNeedReferralActived(true)).rejects.toThrow('CallerNotInList')

      await expect(() => f.setStartTimestamp(0n)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setDuration(3600 * 24 * 30)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setExtraUsdGas(10n ** 16n)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setMintSuccessRatePPB(10n ** 9n / 3n)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setFailedDeductRatePPB(10n ** 9n / 10n)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setSuccessDeductRatePPB(10n ** 9n / 2n)).rejects.toThrow('CallerNotInList')

      await expect(() => f.setEthUsdPriceFeeder(priceFeederAddr)).rejects.toThrow('CallerNotInList')
      await expect(() => f.setEthReceiverAdmin(receiverAdminAddr)).rejects.toThrow('CallerNotInList')
    }

    await msa.addCallers([referralAddr, fAddr, marsTokenAddr, priceFeederAddr, receiverAdminAddr, airdropAddr])
    //MsgSenderNotSigner
    {
      const mars1 = marsToken.connect(signers[1])
      const p1 = priceFeeder.connect(signers[1])
      const a1 = ethReceiverAdmin.connect(signers[1])

      await expect(() => mars1.mint(ss[1], e18)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => mars1.addAdmin(fAddr)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => mars1.removeAdmin(fAddr)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => p1.setAnswer(2000n * 10n ** 8n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => a1.addReceivers([ss[0], ss[1]])).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => a1.removeReceiver(ss[1])).rejects.toThrow('MsgSenderNotSigner')

      await expect(() => f1.setStartTimestamp(0n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setDuration(3600 * 24 * 30)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setExtraUsdGas(10n ** 16n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setMintSuccessRatePPB(10n ** 9n / 3n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setFailedDeductRatePPB(10n ** 9n / 10n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setSuccessDeductRatePPB(10n ** 9n / 2n)).rejects.toThrow('MsgSenderNotSigner')

      await expect(() => f1.setReferral(referralAddr)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setLevel1RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setLevel2RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setNeedReferralActived(true)).rejects.toThrow('MsgSenderNotSigner')

      await expect(() => f1.setEthUsdPriceFeeder(priceFeederAddr)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => f1.setEthReceiverAdmin(receiverAdminAddr)).rejects.toThrow('MsgSenderNotSigner')
    }

    const gasPrice = (await provider.getFeeData()).gasPrice!
    const confirmGasFee = (await f4.CONFIRM_GAS()) * gasPrice
    //mintSucc
    {
      await marsToken.mint(ss[1], 10n ** 22n)
      await marsToken.addAdmin(fAddr)
      await marsToken.addAdmin(airdropAddr)

      await f.setLevel1RewardRatePPB(3n * 10n ** 7n)
      await f.setLevel2RewardRatePPB(1n * 10n ** 7n)
      await f.setNeedReferralActived(true)
      await f.setReferral(referralAddr)

      const blockNumber = await provider.getBlockNumber()
      await referral.setRootDeadlineBlockNumber(blockNumber + 3600 * 24 * 7)
      await referral.connect(signers[8]).activeReferral(referralAddr)
      await referral.connect(signers[4]).activeReferral(ss[8])
      await referral.connect(signers[3]).activeReferral(ss[4])
      await referral.connect(signers[2]).activeReferral(ss[4])
      await referral.connect(signers[1]).activeReferral(ss[2])
      await referral.activeReferral(ss[2])

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
      //
      {
        await priceFeeder.setAnswer(2000n * 10n ** 8n)
        await mine(100000000n)
        const expectAmount = 10n
        const needPayEth = (await f4.calcNeedPayEth(expectAmount)) + confirmGasFee

        await expect(() => f4.premint(expectAmount, confirmGasFee, { value: 100n, gasPrice })).rejects.toThrow(
          'NotEnabled'
        )

        await f.setEnabled(true)

        await expect(() => f4.premint(expectAmount, confirmGasFee, { value: 100n, gasPrice })).rejects.toThrow(
          'MsgValueTooLow'
        )

        await expect(() => f4.premint(0, confirmGasFee, { value: confirmGasFee, gasPrice })).rejects.toThrow(
          'ExpectMintAmountIsZero'
        )

        await expect(() =>
          f4.premint(expectAmount, confirmGasFee >> 1n, { value: needPayEth, gasPrice })
        ).rejects.toThrow('ConfirmGasFeeTooLow')
        await expect(() => f4.premint(expectAmount, confirmGasFee, { value: needPayEth, gasPrice })).rejects.toThrow(
          'FairMintExpired'
        )
        await f.setStartTimestamp((await provider.getBlock('latest'))!.timestamp + 3000)
        await expect(() => f.connect(signers[4]).premint(expectAmount, confirmGasFee, { value: e18 })).rejects.toThrow(
          'FairMintNotStarted'
        )
        await f.setStartTimestamp((await provider.getBlock('latest'))!.timestamp - 10)
        await expect(() => f9.premint(expectAmount, confirmGasFee, { value: 10n ** 20n })).rejects.toThrow(
          'NeedReferralActived'
        )
        await expect(() => f4.confirmMint()).rejects.toThrow('PremintsIsEmpty')
        expect(await f4.getAllPremints()).toStrictEqual([])
      }
      //
      // {
      //   const eth1mToMars = await f.calcMintAmount(e18 * 1000_000n)
      //   const mars1mToEth = await f.calcNeedPayEth(e18 * 1000_000n)
      //   const ethBalance = await provider.getBalance(ss[0])
      //   const baseGasPrice = (await provider.getFeeData()).gasPrice!
      //   const gasPrice = baseGasPrice + (baseGasPrice >> 2n)
      //   const gasFee = CONFIRM_GAS * gasPrice
      //   const minEthValue = gasFee * 4n
      //   const max = (eth1mToMars * (ethBalance - gasFee - gasFee)) / 1000_000n / e18
      //   const min = (eth1mToMars * minEthValue) / 1000_000n / e18
      //   const maxAmount = (max / e18) * e18
      //   const minAmount = ((min + e18) / e18) * e18

      //   console.log({
      //     ethToMars: Number(eth1mToMars) / 1e6 / 1e18,
      //     marsToEth: Number(mars1mToEth) / 1e6 / 1e18,
      //     minEthValue: Number(minEthValue) / 1e18,
      //     gasFee: Number(gasFee) / 1e18,
      //     gasPrice: Number(gasPrice) / 1e9,
      //     max: Number(max) / 1e18,
      //     min: Number(min) / 1e18,
      //     maxAmount: Number(maxAmount) / 1e18,
      //     minAmount: Number(minAmount) / 1e18,
      //     minEthGetMars: Number(await f.calcMintAmount(minEthValue)) / 1e18,
      //     minMarsNeedPayEth: Number(await f.calcNeedPayEth(minAmount)) / 1e18
      //   })
      //   const receipt = await (await f.premint(minAmount, confirmGasFee, { value: minEthValue, gasPrice })).wait()
      //   console.log(receipt)
      // }
      // console.log('---end---')

      let expectAmount = 100n
      let value = (await f4.calcNeedPayEth(expectAmount)) + confirmGasFee

      const pre = await (await f1.premint(expectAmount, confirmGasFee, { value, gasPrice })).wait()

      expect(await f4.getPremintCount()).toBe(1n)
      expect(await provider.getBalance(fAddr)).toBe(value)
      await mine(20)
      await expect(() => f9.confirmMint()).rejects.toThrow('NoEthReceiverFound')
      await ethReceiverAdmin.addReceivers(ss.slice(5, 6))
      expect(await ethReceiverAdmin.getReceivers()).toStrictEqual([ss[5]])

      const b5 = await provider.getBalance(ss[5])
      const b9 = await provider.getBalance(ss[9])
      const m1 = await marsToken.balanceOf(ss[1])
      const conf = await (await f9.confirmMint({ gasPrice })).wait()
      console.log('--first--', {
        premintMint: {
          tx: pre?.hash,
          gasUsed: pre?.gasUsed,
          gasPrice: pre?.gasPrice,
          fee: pre?.fee,
          cumulativeGasUsed: pre?.cumulativeGasUsed
        },
        confirmMint: {
          tx: conf?.hash,
          gasUsed: conf?.gasUsed,
          gasPrice: conf?.gasPrice,
          fee: conf?.fee,
          cumulativeGasUsed: conf?.cumulativeGasUsed
        }
      })
      expect(await provider.getBalance(ss[9])).toBe(b9 - conf!.fee + confirmGasFee)
      expect(await marsToken.balanceOf(ss[1])).toBe(m1 + expectAmount)

      expect(await f4.getPremintCount()).toBe(0n)
      const v2 = value - confirmGasFee
      const d2 = (v2 * 50n) / 100n
      const cm1 = expectAmount
      expect(await provider.getBalance(fAddr)).toBe(d2)
      expect(await provider.getBalance(ss[5])).toBe(b5 + v2 - d2)
      expect(await marsToken.balanceOf(ss[1])).toBe(m1 + cm1)
      expect(await f1.totalMinted()).toBe(cm1)

      console.log(await f1.getAccountData(ss[1]))
      console.log(await f1.getAccountData(ss[2]))
      console.log(await f1.getAccountData(ss[4]))
      console.log(await f1.getAccountData(ss[8]))

      {
        const pre = await (await f2.premint(expectAmount, confirmGasFee, { value, gasPrice })).wait()
        await mine(20)
        const conf = await (await f9.confirmMint()).wait()
        console.log('--second--', {
          premintMint: {
            tx: pre?.hash,
            gasUsed: pre?.gasUsed,
            gasPrice: pre?.gasPrice,
            fee: pre?.fee,
            cumulativeGasUsed: pre?.cumulativeGasUsed
          },
          confirmMint: {
            tx: conf?.hash,
            gasUsed: conf?.gasUsed,
            gasPrice: conf?.gasPrice,
            fee: conf?.fee,
            cumulativeGasUsed: conf?.cumulativeGasUsed
          }
        })
      }

      await f0.premint(expectAmount, confirmGasFee, { value, gasPrice })
      await expect(() => f9.confirmMint()).rejects.toThrow('NeedWaittingForBlocks')
      await mine(20)
      await f9.confirmMint()
      // console.log('--------------------------')
      // console.log(await f1.getAccountData(ss[1]))
      // console.log(await f1.getAccountData(ss[2]))
      // console.log(await f1.getAccountData(ss[4]))
      // console.log(await f1.getAccountData(ss[8]))
    }

    //mintFailed
    {
      const eth0 = await provider.getBalance(ss[0])
      const ethf = await provider.getBalance(fAddr)
      const mars0 = await marsToken.balanceOf(ss[0])
      let expectAmount = 1005
      const value = (await f0.calcNeedPayEth(expectAmount)) + confirmGasFee
      const r0 = await (await f0.premint(expectAmount, confirmGasFee, { value, gasPrice })).wait()
      expect(await provider.getBalance(fAddr)).toBe(ethf + value)

      await mine(20)
      const r2 = await (await f9.confirmMint({ gasPrice })).wait()
      const v2 = value - confirmGasFee
      const d2 = (v2 * 10n ** 8n) / 10n ** 9n

      expect(await provider.getBalance(fAddr)).toBe(ethf + d2)
      expect(await marsToken.balanceOf(ss[0])).toBe(mars0)
      expect(await provider.getBalance(ss[0])).toBe(eth0 - r0!.fee - value + (v2 - d2))
    }

    //success1
    {
      console.log('----------success-----------')
      expect(await f.getPremintCount()).toBe(0n)
      const expectAmount = (maxMintSupply / 400n) * 300n
      expect((await f.totalMinted()) + expectAmount).toBeLessThan(maxMintSupply)

      expect(await f.calcMintAmount(await f.calcNeedPayEth(expectAmount * 1000_000n))).toBe(expectAmount * 1000_000n)
      const v1 = await f.calcNeedPayEth(expectAmount * 1000_000n)
      expect(await f.calcNeedPayEth(await f.calcMintAmount(v1))).toBe(v1)

      const value = (await f.calcNeedPayEth(expectAmount)) + confirmGasFee
      const v2 = value - confirmGasFee
      const d2 = (v2 * (10n ** 9n / 2n)) / 10n ** 9n

      await setBalance(ss[0], value * 5n)

      const eth0 = await provider.getBalance(ss[0])
      const ethf = await provider.getBalance(fAddr)
      const mars0 = await marsToken.balanceOf(ss[0])
      const eth5 = await provider.getBalance(ss[5])

      const r0 = await (await f.premint(expectAmount, confirmGasFee, { value, gasPrice })).wait()
      await mine(20)
      console.log(await f9.getAllPremints())
      expect(await provider.getBalance(fAddr)).toBe(ethf + value)
      const r2 = await (await f9.confirmMint()).wait()

      console.log({ v2, confirmGasFee, d2, ethf1: ethf, ethf2: await provider.getBalance(fAddr) })

      expect(await provider.getBalance(ss[5])).toBe(eth5 + (v2 - d2))
      expect(await provider.getBalance(ss[0])).toBe(eth0 - r0!.fee - value)
      expect(await marsToken.balanceOf(ss[0])).toBe(mars0 + expectAmount)
      expect(await provider.getBalance(fAddr)).toBe(ethf + d2)
    }

    //batMint1
    {
      console.log('----------batmint-----------')
      expect(await f.getPremintCount()).toBe(0n)
      const expectAmount = await f.calcMintAmount(3n * e18)
      const value = (await f.calcNeedPayEth(expectAmount)) + confirmGasFee

      const expectAmount2 = (await f.calcMintAmount(3n * e18)) + 1n
      const value2 = (await f.calcNeedPayEth(expectAmount2)) + confirmGasFee

      const ethf = await provider.getBalance(fAddr)
      const eth9 = await provider.getBalance(ss[9])
      const eth5 = await provider.getBalance(ss[5])

      const mars1 = await marsToken.balanceOf(ss[1])
      const mars2 = await marsToken.balanceOf(ss[2])
      const mars3 = await marsToken.balanceOf(ss[3])
      const mars4 = await marsToken.balanceOf(ss[4])

      const totalSupply1 = await marsToken.totalSupply()
      const totalMinted1 = await f.totalMinted()

      const confirmMintReceipts = []

      const f3 = f.connect(signers[3])
      await Promise.all([
        f1.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f1.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f2.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f2.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f3.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f3.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f4.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f4.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice })
      ])
      confirmMintReceipts.push(await (await f9.confirmMint()).wait())
      await Promise.all([
        f1.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f1.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f2.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f2.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f3.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f3.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f4.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f4.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice })
      ])
      confirmMintReceipts.push(await (await f9.confirmMint()).wait())
      await Promise.all([
        f1.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f1.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f2.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f2.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f3.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f3.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f4.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f4.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice })
      ])
      confirmMintReceipts.push(await (await f9.confirmMint()).wait())
      await Promise.all([
        f1.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f1.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f2.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f2.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f3.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f3.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f4.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f4.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice })
      ])
      confirmMintReceipts.push(await (await f9.confirmMint()).wait())
      await Promise.all([
        f1.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f1.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f2.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f2.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f3.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f3.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice }),
        f4.premint(expectAmount, confirmGasFee, { value, gasPrice }),
        f4.premint(expectAmount2, confirmGasFee, { value: value2, gasPrice })
      ])
      confirmMintReceipts.push(await (await f9.confirmMint()).wait())

      await mine(20)
      confirmMintReceipts.push(await (await f9.confirmMint()).wait())

      const ethf_2 = await provider.getBalance(fAddr)
      const eth9_2 = await provider.getBalance(ss[9])
      const eth5_2 = await provider.getBalance(ss[5])
      const totalSupply2 = await marsToken.totalSupply()
      const totalMinted2 = await f.totalMinted()

      expect(await marsToken.balanceOf(ss[1])).toBe(mars1 + expectAmount * 5n)
      expect(await marsToken.balanceOf(ss[2])).toBe(mars2 + expectAmount * 5n)
      expect(await marsToken.balanceOf(ss[3])).toBe(mars3 + expectAmount * 5n)
      expect(await marsToken.balanceOf(ss[4])).toBe(mars4 + expectAmount * 5n)

      const totalMintedAmount = 5n * 4n * expectAmount
      expect(totalSupply2 - totalSupply1).toBe(totalMintedAmount)
      expect(totalMinted2 - totalMinted1).toBe(totalMintedAmount)

      const totalSendToAdmin = 5n * 4n * (value - confirmGasFee - (value - confirmGasFee) / 2n)
      expect(eth5_2).toBe(eth5 + totalSendToAdmin)

      const totalConfirmGas = 5n * 8n * confirmGasFee
      const totalValue = 5n * 4n * value + 5n * 4n * value2
      const totalFailedRefund = 5n * 4n * (value2 - confirmGasFee - (value2 - confirmGasFee) / 10n)

      expect(ethf_2).toBe(ethf + totalValue - totalConfirmGas - totalSendToAdmin - totalFailedRefund)
    }

    //success2
    {
      console.log('----------success2-----------')
      expect(await f.getPremintCount()).toBe(0n)
      const expectAmount = (maxMintSupply / 400n) * 200n
      expect((await f.totalMinted()) + expectAmount).toBeGreaterThan(maxMintSupply)

      const value = (await f.calcNeedPayEth(expectAmount)) + confirmGasFee
      const v2 = value - confirmGasFee
      await setBalance(ss[1], value * 5n)

      const eth0 = await provider.getBalance(ss[0])
      const eth1 = await provider.getBalance(ss[1])
      const ethf = await provider.getBalance(fAddr)
      const mars0 = await marsToken.balanceOf(ss[0])
      const eth5 = await provider.getBalance(ss[5])

      const realMinted = maxMintSupply - (await f.totalMinted())
      const refund = (v2 * (expectAmount - realMinted)) / expectAmount
      const d3 = ((v2 - refund) * (10n ** 9n / 2n)) / 10n ** 9n

      const r0 = await (await f.premint(expectAmount, confirmGasFee, { value, gasPrice })).wait()
      const r1 = await (await f1.premint(expectAmount, confirmGasFee, { value, gasPrice })).wait()
      await mine(20)
      expect(await f9.getPremintCount()).toBe(2n)
      expect(await provider.getBalance(fAddr)).toBe(ethf + value + value)
      const r2 = await (await f9.confirmMint()).wait()
      expect(await f9.getPremintCount()).toBe(0n)

      expect(await provider.getBalance(ss[1])).toBe(eth1 - value - r1!.fee + v2)
      expect(await provider.getBalance(ss[5])).toBe(eth5 + d3)

      expect(await provider.getBalance(ss[0])).toBe(eth0 - r0!.fee - value + refund)
      expect(await marsToken.balanceOf(ss[0])).toBe(mars0 + realMinted)
      expect(await provider.getBalance(fAddr)).toBe(ethf + d3)

      const v = (await f.calcNeedPayEth(1n)) + confirmGasFee
      await expect(() => f.premint(1n, confirmGasFee, { value: v, gasPrice })).rejects.toThrow('MintQuotaUsedUp')

      await f.setMaxMintSupply(maxMintSupply * 4n)
    }

    //airdrop
    {
      const expectAmount = await f.calcMintAmount(3n * e18)
      const value = (await f.calcNeedPayEth(expectAmount)) + confirmGasFee
      await f.connect(signers[8]).premint(expectAmount, confirmGasFee, { value, gasPrice })

      const expectAmount2 = (await f.calcMintAmount(3n * e18)) + 1n
      const value2 = (await f.calcNeedPayEth(expectAmount2)) + confirmGasFee
      await f.connect(signers[4]).premint(expectAmount2, confirmGasFee, { value: value2, gasPrice })
      await mine(100)
      console.log(await f.getAllPremints())
      console.log(await provider.getBlockNumber())
      await f.confirmMint()

      const d8 = await a0.getAccountData(ss[8])
      const d4 = await a0.getAccountData(ss[4])
      const d0 = await a0.getAccountData(ss[0])

      const aas = await Promise.all([a0.getAccountData(ss[8]), a0.getAccountData(ss[4]), a0.getAccountData(ss[0])])
      const ads = aas.map((d) => ({
        availableAmount: d.availableAmount,
        premintCount: d.premintCount,
        collectedAmount: d.collectedAmount
      }))
      console.log(ads)

      expect((await a0.signerAddress()).toLowerCase()).toBe(ss[0].toLowerCase())

      //signature
      {
        const timestamp = (await provider.getBlock('latest'))?.timestamp!
        const domain: TypedDataDomain = {
          name: 'Airdrop',
          version: '1.0',
          chainId: hardhat.network.config.chainId + '',
          verifyingContract: airdropAddr
        }

        const dataTypes = {
          Data: [
            { name: 'signer', type: 'address' },
            { name: 'receiver', type: 'address' },
            { name: 'airdropToken', type: 'address' },
            { name: 'timestamp', type: 'uint64' }
          ]
        }
        const data = {
          signer: ss[0],
          receiver: ss[8],
          airdropToken: marsTokenAddr,
          timestamp: timestamp + ''
        }

        const signature8 = await signers[0].signTypedData(domain, dataTypes, data)
        const verified8 = await airdrop.checkSignature(ss[8], timestamp!, signature8)
        expect(verified8).toBe(true)

        const b8 = await marsToken.balanceOf(ss[8])
        await a8.collectAirdrop(timestamp!, signature8)
        expect(await marsToken.balanceOf(ss[8])).toBe(b8 + d8.availableAmount)
        const d8a = await a0.getAccountData(ss[8])
        expect(d8a.availableAmount).toBe(0n)
        expect(d8a.collectedAmount).toBe(d8a.totalAmount)

        const signature4 = await signers[0].signTypedData(domain, dataTypes, { ...data, receiver: ss[4] })
        console.log('--signTypedData--', { domain, dataTypes, data, signature4 })
        const b4 = await marsToken.balanceOf(ss[4])
        await a4.collectAirdrop(timestamp!, signature4)
        expect(await marsToken.balanceOf(ss[4])).toBe(b4 + d4.availableAmount)
        const d4a = await a0.getAccountData(ss[8])
        expect(d4a.availableAmount).toBe(0n)
        expect(d4a.collectedAmount).toBe(d4a.totalAmount)

        const signature0 = await signers[0].signTypedData(domain, dataTypes, { ...data, receiver: ss[0] })
        console.log('--signTypedData--', { domain, dataTypes, data, signature0 })
        await expect(() => a0.collectAirdrop(timestamp!, signature0)).rejects.toThrow('InsufficientAvailableAmount')
        await expect(() => a0.collectAirdrop(timestamp!, signature4)).rejects.toThrow('InvalidSignature')
        await expect(() => a0.collectAirdrop(timestamp + 2, signature0)).rejects.toThrow('InvalidSignature')

        const signature1 = await signers[0].signTypedData(domain, dataTypes, {
          ...data,
          timestamp: timestamp - 3600 * 72,
          receiver: ss[1]
        })
        expect(await a1.checkSignature(ss[1], timestamp - 3600 * 72, signature1)).toBe(true)
        await expect(() => a1.collectAirdrop(timestamp - 3600 * 72, signature0)).rejects.toThrow('SignatureExpired')
      }
    }
  }, 50_000)
})
