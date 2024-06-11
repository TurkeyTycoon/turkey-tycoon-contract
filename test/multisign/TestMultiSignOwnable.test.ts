import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import { MultiSignAdmin__factory, TestMultiSignOwnable__factory } from '../../typechain-types'
import { ZeroAddress } from 'ethers'

describe('TestMultiSignOwnable.sol', () => {
  test('multisigncall', async () => {
    const signers = await hardhat.ethers.getSigners()
    const sender = signers[0].address

    const m = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
    const u = await deploy<TestMultiSignOwnable__factory>('TestMultiSignOwnable', await m.getAddress())
    const mAddr = await m.getAddress()
    const uAddr = await u.getAddress()

    const m1 = m.connect(signers[1])
    {
      await expect(() =>
        execTx(() => m.multiSigned(uAddr, '0xa0712d680000000000000000000000000000000000000000000000000000000000000001'))
      ).rejects.toThrow('CallerNotInList')
      await expect(() => execTx(() => u.mint(sender, 10n ** 20n))).rejects.toThrow('CallerNotInList')

      await expect(() => execTx(() => u.renounceOwnership())).rejects.toThrow('CallerNotInList')
      await expect(() => execTx(() => u.transferOwnership(sender))).rejects.toThrow('CallerNotInList')

      await expect(() => execTx(() => m1.addCaller(mAddr))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.addCallers([uAddr]))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.removeCaller(mAddr))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.removeCallers([uAddr]))).rejects.toThrow('MsgSenderNotSigner')

      await expect(() => execTx(() => m.removeCaller(mAddr))).rejects.toThrow('CallerNotFound')
      await expect(() => execTx(() => m.removeCallers([uAddr]))).rejects.toThrow('CallerNotFound')
      await expect(() => m.getCallerAt(0)).rejects.toThrow('CallerIndexOutOfRange')

      await execTx(() => m.addCaller(mAddr))
      await execTx(() => m.addCallers([uAddr]))

      await expect(() => execTx(() => u.connect(signers[1]).mint(sender, 10n ** 20n))).rejects.toThrow(
        'MsgSenderNotSigner'
      )

      await expect(() => execTx(() => u.connect(signers[1]).renounceOwnership())).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => u.connect(signers[1]).transferOwnership(sender))).rejects.toThrow(
        'MsgSenderNotSigner'
      )

      await execTx(() => u.mint(sender, 10n ** 20n))
      expect(await u.balanceOf(sender)).toBe(10n ** 20n)
      await execTx(() => u.burn(sender, 10n ** 20n))
      expect(await u.balanceOf(sender)).toBe(0n)

      const [mCallers, count, c0, c1, icm, icu, icf, initOwner] = await Promise.all([
        m.getCallers(),
        m.getCallerCount(),
        m.getCallerAt(0),
        m.getCallerAt(1),
        m.isCaller(mAddr),
        m.isCaller(uAddr),
        m.isCaller(sender),
        u.owner()
      ])
      expect([...mCallers].sort()).toStrictEqual([mAddr, uAddr].sort())
      expect([c0, c1].sort()).toStrictEqual([mAddr, uAddr].sort())
      expect(mCallers).toHaveLength(2)
      expect(count).toBe(2n)
      expect([icm, icu, icf]).toStrictEqual([true, true, false])
      expect(initOwner).toBe(mAddr)

      await expect(() => m.getCallerAt(2)).rejects.toThrow('CallerIndexOutOfRange')
      await expect(() => execTx(() => m.addCaller(mAddr))).rejects.toThrow('CallerAlreadyExists')
      await expect(() => execTx(() => m.addCallers([uAddr]))).rejects.toThrow('CallerAlreadyExists')
    }

    //removeCallers
    {
      await execTx(() => m.removeCaller(mAddr))
      await execTx(() => m.removeCallers([uAddr]))
      const [mCallers, count, icm, icu, icf] = await Promise.all([
        m.getCallers(),
        m.getCallerCount(),
        m.isCaller(mAddr),
        m.isCaller(uAddr),
        m.isCaller(sender)
      ])
      expect(mCallers).toHaveLength(0)
      expect(count).toBe(0n)
      expect([icm, icu, icf]).toStrictEqual([false, false, false])
    }

    {
      await execTx(() => m.addCallers([uAddr]))
      await execTx(() => m.addSigners([signers[1].address, signers[2].address]))
      expect(await m.getRatio()).toStrictEqual([2n, 3n])
      expect(await m.getSigners()).toHaveLength(3)

      await execTx(() => u.mint(sender, 10n ** 20n))
      expect(await u.balanceOf(sender)).toBe(0n)
      await execTx(() => u.connect(signers[1]).mint(sender, 10n ** 20n))
      expect(await u.balanceOf(sender)).toBe(10n ** 20n)

      await execTx(() => u.burn(sender, 10n ** 20n))
      expect(await u.balanceOf(sender)).toBe(10n ** 20n)
      await execTx(() => u.connect(signers[2]).burn(sender, 10n ** 20n))
      expect(await u.balanceOf(sender)).toBe(0n)

      await execTx(() => u.connect(signers[2]).renounceOwnership())
      await execTx(() => u.connect(signers[1]).renounceOwnership())
      expect(await u.owner()).toBe(ZeroAddress);
    }
  }, 50_000)
})
