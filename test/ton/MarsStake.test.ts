import hardhat from 'hardhat'
import { deploy } from '../../lib/deploy-utils'
import {
  TMARS__factory,
  MarsStake__factory,
  MultiSignAdmin__factory,
  Referral__factory,
  TestStakePoint__factory
} from '../../typechain-types'
import { mine } from '@nomicfoundation/hardhat-network-helpers'

describe('MarsStake.sol', () => {
  test('stakeTest', async () => {
    const signers = await hardhat.ethers.getSigners()
    const ss = signers.map((a) => a.address)
    const e18 = 10n ** 18n
    const e9 = 10n ** 9n
    console.log(ss)
    const msa = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
    const msaAddr = await msa.getAddress()
    const referral = await deploy<Referral__factory>('Referral', msaAddr)
    const marsToken = await deploy<TMARS__factory>('TMARS', msaAddr)
    const pointToken = await deploy<TestStakePoint__factory>('TestStakePoint', msaAddr)
    const [referralAddr, marsTokenAddr, pointTokenAddr] = await Promise.all([
      referral.getAddress(),
      marsToken.getAddress(),
      pointToken.getAddress()
    ])
    const s = await deploy<MarsStake__factory>('MarsStake', marsTokenAddr, msaAddr)
    const s1 = s.connect(signers[1])
    const sAddr = await s.getAddress()

    console.log('endBlockNumber',await s.endBlockNumber());

    //CallerNotInList
    {
      await expect(() => marsToken.mint(ss[1], 10n ** 22n)).rejects.toThrow('CallerNotInList')
      await expect(() => pointToken.mint(ss[1], 10n ** 22n)).rejects.toThrow('CallerNotInList')
      await expect(() => pointToken.burn(ss[1], 10n ** 22n)).rejects.toThrow('CallerNotInList')

      await expect(() => s.setReferral(referralAddr)).rejects.toThrow('CallerNotInList')
      await expect(() => s.setPointToken(pointTokenAddr)).rejects.toThrow('CallerNotInList')
      await expect(() => s.setLevel1RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('CallerNotInList')
      await expect(() => s.setLevel2RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('CallerNotInList')
      await expect(() => s.setNeedReferralActived(true)).rejects.toThrow('CallerNotInList')
      await expect(() => s.setPointPerBlock(10n ** 13n)).rejects.toThrow('CallerNotInList')
    }
    await msa.addCallers([referralAddr, marsTokenAddr, pointTokenAddr, sAddr])
    //MsgSenderNotSigner
    {
      await expect(() => marsToken.connect(signers[1]).mint(ss[1], 10n ** 22n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => pointToken.connect(signers[1]).mint(ss[1], 10n ** 22n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => pointToken.connect(signers[1]).burn(ss[1], 10n ** 22n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => s1.setReferral(referralAddr)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => s1.setPointToken(pointTokenAddr)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => s1.setLevel1RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => s1.setLevel2RewardRatePPB(5n * 10n ** 7n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => s1.setNeedReferralActived(true)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => s1.setPointPerBlock(10n ** 13n)).rejects.toThrow('MsgSenderNotSigner')
    }

    {
      await marsToken.mint(ss[1], 10n ** 22n)
      await pointToken.mint(ss[1], 10n ** 22n)
      await pointToken.burn(ss[1], 10n ** 22n)

      // await s.setLevel1RewardRatePPB(5n * 10n ** 7n)
      // await s.setLevel2RewardRatePPB(2n * 10n ** 7n)
      // await s.setNeedReferralActived(true)
      // await s.setPointPerBlock(10n ** 13n)
      await s.setReferral(referralAddr)
      await s.setPointToken(pointTokenAddr)
      await pointToken.mint(ss[2], e18 * 10000n)
      await pointToken.addAdmin(sAddr)

      const blockNumber = await signers[0].provider.getBlockNumber()
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

      // deposit
      await expect(() => s.connect(signers[9]).deposit(10n ** 20n)).rejects.toThrow('NeedReferralActived')
      await expect(() => s.connect(signers[4]).deposit(10n ** 20n)).rejects.toThrow('ERC20InsufficientAllowance')
      await marsToken.connect(signers[0]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[1]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[2]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[3]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[4]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[5]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[6]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[7]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[8]).approve(sAddr, 10n ** 22n)
      await marsToken.connect(signers[9]).approve(sAddr, 10n ** 22n)
    }

    const level1RewardRatePPB = await s.level1RewardRatePPB()
    const level2RewardRatePPB = await s.level2RewardRatePPB()
    const pointPerBlock = await s.pointPerBlock()
    const blockCount = 40000n
    const depositAmount = 100n * 10n ** 18n
    {
      const ap1 = (depositAmount * blockCount * pointPerBlock) / e18
      const ap2 = (((depositAmount * blockCount * pointPerBlock) / e18) * level1RewardRatePPB) / e9
      const ap4 = (((depositAmount * blockCount * pointPerBlock) / e18) * level2RewardRatePPB) / e9

      const b1 = await marsToken.balanceOf(ss[1])
      await s1.deposit(depositAmount)
      expect(await marsToken.balanceOf(sAddr)).toBe(depositAmount)
      expect(await marsToken.balanceOf(ss[1])).toBe(b1 - depositAmount)
      await mine(blockCount)
      expect((await s.getAccountData(ss[1])).availablePoints).toBe(ap1)
      expect((await s.getAccountData(ss[2])).availablePoints).toBe(ap2)
      expect((await s.getAccountData(ss[4])).availablePoints).toBe(ap4)

      expect((ap2 * e9) / ap1).toBe(level1RewardRatePPB)
      expect((ap4 * e9) / ap1).toBe(level2RewardRatePPB)

      expect((await s.getAccountData(ss[1])).r0.depositedAmount).toBe(depositAmount)
      expect((await s.getAccountData(ss[2])).r1.depositedAmount).toBe(depositAmount)
      expect((await s.getAccountData(ss[4])).r2.depositedAmount).toBe(depositAmount)

      const mars0 = await marsToken.balanceOf(ss[0])
      const mars1 = await marsToken.balanceOf(ss[1])
      const mars2 = await marsToken.balanceOf(ss[2])
      await s1.deposit(depositAmount)
      await s.connect(signers[2]).deposit(depositAmount)
      await s.deposit(depositAmount)
      expect(await marsToken.balanceOf(sAddr)).toBe(depositAmount * 4n)
      expect(await marsToken.balanceOf(ss[0])).toBe(mars0 - depositAmount)
      expect(await marsToken.balanceOf(ss[1])).toBe(mars1 - depositAmount)
      expect(await marsToken.balanceOf(ss[2])).toBe(mars2 - depositAmount)

      await s1.collectPoints()
      await s.connect(signers[2]).collectPoints()
      await mine(blockCount)
      expect((await s.getAccountData(ss[0])).r0.depositedAmount).toBe(depositAmount)
      expect((await s.getAccountData(ss[1])).r0.depositedAmount).toBe(depositAmount * 2n)

      expect((await s.getAccountData(ss[2])).r0.depositedAmount).toBe(depositAmount)
      expect((await s.getAccountData(ss[2])).r1.depositedAmount).toBe(depositAmount * 3n)

      expect((await s.getAccountData(ss[4])).r1.depositedAmount).toBe(depositAmount)
      expect((await s.getAccountData(ss[4])).r2.depositedAmount).toBe(depositAmount * 3n)
    }

    {
      const withdrawAmount = depositAmount / 2n
      const ms0 = await marsToken.balanceOf(ss[0])
      const ms1 = await marsToken.balanceOf(ss[1])
      const ms2 = await marsToken.balanceOf(ss[2])
      await s.connect(signers[0]).withdraw(withdrawAmount)
      await s1.withdrawAll()
      await s.connect(signers[2]).withdraw(withdrawAmount)
      expect(await marsToken.balanceOf(ss[0])).toBe(ms0 + withdrawAmount)
      expect(await marsToken.balanceOf(ss[1])).toBe(ms1 + 2n * depositAmount)
      expect(await marsToken.balanceOf(ss[2])).toBe(ms2 + withdrawAmount)
      expect(await marsToken.balanceOf(sAddr)).toBe(depositAmount)
      expect((await s.getAccountData(ss[0])).r0.withdrawnAmount).toBe(withdrawAmount)
      expect((await s.getAccountData(ss[1])).r0.withdrawnAmount).toBe(4n * withdrawAmount)
      expect((await s.getAccountData(ss[2])).r0.withdrawnAmount).toBe(withdrawAmount)
      expect((await s.getAccountData(ss[2])).r1.withdrawnAmount).toBe(5n * withdrawAmount)
      expect((await s.getAccountData(ss[4])).r1.withdrawnAmount).toBe(withdrawAmount)
      expect((await s.getAccountData(ss[4])).r2.withdrawnAmount).toBe(5n * withdrawAmount)

      await s.connect(signers[0]).collectPoints()
      await s1.collectPoints()
      await s.connect(signers[2]).collectPoints()
      await s.connect(signers[4]).collectPoints()

      const [a0, a1, a2, a4] = await Promise.all([
        s.getAccountData(ss[0]),
        s.getAccountData(ss[1]),
        s.getAccountData(ss[2]),
        s.getAccountData(ss[4])
      ])
      console.log({ a0, a1, a2, a4 })
    }
  }, 500_000)
})
