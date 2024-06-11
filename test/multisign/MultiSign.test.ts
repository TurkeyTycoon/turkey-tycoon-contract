import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import { TestMultiSign__factory } from '../../typechain-types'
import { mine } from '@nomicfoundation/hardhat-network-helpers'
import { ContractTransactionReceipt } from 'ethers'
import { MultiSignedEvent } from '../../typechain-types/contracts/multisign/test/TestMultiSign'

describe('MultiSign.sol', () => {
  test('multisign', async () => {
    const signers = await hardhat.ethers.getSigners()
    const sender = signers[0].address

    const m = await deploy<TestMultiSign__factory>('TestMultiSign')
    const m1 = m.connect(signers[1])
    const m2 = m.connect(signers[2])
    //Test Not Signer Operation
    {
      await expect(() => execTx(() => m1.writeTest(9999n))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.setRatio(1, 30))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.setSignTimeout(60 * 20))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.addSigner(sender))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.addSigners([sender]))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.removeSigner(sender))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m1.removeSigners([sender]))).rejects.toThrow('MsgSenderNotSigner')

      await expect(() => execTx(() => m.addSigner(sender))).rejects.toThrow('SignerAlreadyExists')
      await expect(() => execTx(() => m.addSigners([sender]))).rejects.toThrow('SignerAlreadyExists')
      await expect(() => execTx(() => m.removeSigner(sender))).rejects.toThrow('UnableRemoveOnlySigner')
      await expect(() => execTx(() => m.removeSigners([sender]))).rejects.toThrow('UnableRemoveOnlySigner')
      await expect(() => execTx(() => m.removeSigner(signers[1].address))).rejects.toThrow('SignerNotFound')
      await expect(() => execTx(() => m.removeSigners([signers[1].address]))).rejects.toThrow('SignerNotFound')

      await expect(() => m.getSignerAt(1)).rejects.toThrow('SignerIndexOutOfRange')
      await expect(() => m.getSignerAt(10000)).rejects.toThrow('SignerIndexOutOfRange')

      await expect(() => execTx(() => m.setSignTimeout(20))).rejects.toThrow('SignTimeoutLessThan30Seconds')
      await expect(() => execTx(() => m.setSignTimeout(0))).rejects.toThrow('SignTimeoutLessThan30Seconds')

      await expect(() => execTx(() => m.setRatio(0, 3))).rejects.toThrow('MolecularLessThanOne')
      await expect(() => execTx(() => m.setRatio(8, 3))).rejects.toThrow('MolecularGreaterThanDenominator')
      await expect(() => execTx(() => m.setRatio(1, 0))).rejects.toThrow('MolecularGreaterThanDenominator')
    }

    //Test getRatio,  the default value should be 2/3
    {
      const [mol, den, [rmol, rden], st] = await Promise.all([
        m.molecular(),
        m.denominator(),
        m.getRatio(),
        m.signTimeout()
      ])
      expect(mol).toBe(rmol)
      expect(mol).toBe(2n)
      expect(den).toBe(rden)
      expect(den).toBe(3n)
      expect(st).toBe(10n * 60n)
    }

    //Test setRatio to 1/30, setSignTimeout to 30s;
    {
      await execTx(() => m.setRatio(1, 30))
      await execTx(() => m.setSignTimeout(20 * 60))
      const [mol, den, [rmol, rden], st] = await Promise.all([
        m.molecular(),
        m.denominator(),
        m.getRatio(),
        m.signTimeout()
      ])
      expect(mol).toBe(rmol)
      expect(mol).toBe(1n)
      expect(den).toBe(rden)
      expect(den).toBe(30n)
      expect(st).toBe(20n * 60n)
    }

    //Test getSigners -- only one signer,  ratio is 1/30
    {
      const [mSigners, signerCount, isSigner, [mSigners0, operHash], lastValue] = await Promise.all([
        m.getSigners(),
        m.getSignerCount(),
        m.isSigner(sender),
        m.getSignerAt(0),
        m.lastValue()
      ])
      expect(mSigners).toHaveLength(1)
      expect(mSigners).toStrictEqual([sender])
      expect(signerCount).toBe(1n)
      expect(isSigner).toBe(true)
      expect(mSigners0).toBe(sender)
      expect(operHash).toBe(0n)
      expect(lastValue).toBe(0n)

      await execTx(() => m.writeTest(8888n))
      expect(await m.lastValue()).toBe(8888n)
    }

    //Test  addSigners
    {
      await execTx(() => m.addSigners([signers[1].address, signers[2].address]))
      const [mSigners, signerCount, isS0, isS1, isS2, isS3, [s0], [s1], [s2]] = await Promise.all([
        m.getSigners(),
        m.getSignerCount(),
        m.isSigner(sender),
        m.isSigner(signers[1].address),
        m.isSigner(signers[2].address),
        m.isSigner(signers[3].address),
        m.getSignerAt(0),
        m.getSignerAt(1),
        m.getSignerAt(2)
      ])
      expect(mSigners).toHaveLength(3)
      expect(signerCount).toBe(3n)
      expect([isS0, isS1, isS2, isS3]).toStrictEqual([true, true, true, false])
      expect([s0, s1, s2].sort()).toStrictEqual([sender, signers[1].address, signers[2].address].sort())
      expect([...mSigners].sort()).toStrictEqual([sender, signers[1].address, signers[2].address].sort())

      await execTx(() => m.writeTest(8888n))
      expect(await m.lastValue()).toBe(8888n)

      await execTx(() => m1.writeTest(1111n))
      expect(await m1.lastValue()).toBe(1111n)

      await execTx(() => m2.writeTest(2222n))
      expect(await m2.lastValue()).toBe(2222n)
    }

    //Test  removeSigners
    {
      await execTx(() => m1.removeSigners([signers[1].address]))
      await execTx(() => m2.removeSigner(signers[2].address))
      const [mSigners, signerCount, isS0, isS1, isS2, isS3, [s0]] = await Promise.all([
        m.getSigners(),
        m.getSignerCount(),
        m.isSigner(sender),
        m.isSigner(signers[1].address),
        m.isSigner(signers[2].address),
        m.isSigner(signers[3].address),
        m.getSignerAt(0)
      ])
      await expect(() => m.getSignerAt(1)).rejects.toThrow('SignerIndexOutOfRange')
      await expect(() => m.getSignerAt(2)).rejects.toThrow('SignerIndexOutOfRange')
      expect(mSigners).toHaveLength(1)
      expect(signerCount).toBe(1n)
      expect([isS0, isS1, isS2, isS3]).toStrictEqual([true, false, false, false])
      expect([s0]).toStrictEqual([sender])
      expect(mSigners).toStrictEqual([sender])

      await execTx(() => m.writeTest(8888n))
      expect(await m.lastValue()).toBe(8888n)

      await expect(() => execTx(() => m1.writeTest(1111))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => m2.writeTest(2222))).rejects.toThrow('MsgSenderNotSigner')
    }

    //Test multiSign
    {
      await execTx(() => m.addSigners([signers[1].address, signers[2].address]))
      await execTx(() => m.setRatio(1, 3))

      await execTx(() => m.writeTest(8888n))
      expect(await m.lastValue()).toBe(8888n)
      await execTx(() => m1.writeTest(1111n))
      expect(await m1.lastValue()).toBe(1111n)
      await execTx(() => m2.writeTest(2222n))
      expect(await m2.lastValue()).toBe(2222n)

      // same signer sign twice is invalid
      await execTx(() => m.setRatio(2, 3))
      await execTx(() => m.writeTest(11))
      expect(await m.lastValue()).toBe(2222n)
      await execTx(() => m.writeTest(11n))
      expect(await m1.lastValue()).toBe(2222n)

      // two signer signed will be ok
      await execTx(() => m1.writeTest(99))
      expect(await m1.lastValue()).toBe(2222n)
      await execTx(() => m2.writeTest(99n))
      expect(await m2.lastValue()).toBe(99n)

      //test timeout  2/3
      await execTx(() => m1.writeTest(77))
      expect(await m1.lastValue()).toBe(99n)
      await mine(20 * 60 + 10)
      await execTx(() => m2.writeTest(77n))
      expect(await m2.lastValue()).toBe(99n)
      await execTx(() => m.writeTest(77n))
      expect(await m.lastValue()).toBe(77n)

      //-----3/3
      await execTx(() => m.setRatio(3, 3))
      await execTx(() => m1.setRatio(3, 3))
      expect(await m.getRatio()).toStrictEqual([3n, 3n])

      const { receipt: r0 } = await execTx(() => m.writeTest(22))
      const log0 = (r0 as ContractTransactionReceipt).logs[0] as MultiSignedEvent.Log
      expect(log0.args.msgSender).toBe(signers[0].address)
      expect(log0.args.passed).toBe(false)
      expect(log0.args.signedCount).toBe(1n)

      expect(await m.lastValue()).toBe(77n)
      const { receipt: r1 } = await execTx(() => m1.writeTest(22))
      const log1 = (r1 as ContractTransactionReceipt).logs[0] as MultiSignedEvent.Log
      expect(log1.args.msgSender).toBe(signers[1].address)
      expect(log1.args.passed).toBe(false)
      expect(log1.args.signedCount).toBe(2n)

      expect(await m1.lastValue()).toBe(77n)
      const { receipt: r2 } = await execTx(() => m2.writeTest(22n))
      expect(await m2.lastValue()).toBe(22n)
      const log2 = (r2 as ContractTransactionReceipt).logs[0] as MultiSignedEvent.Log
      expect(log2.args.msgSender).toBe(signers[2].address)
      expect(log2.args.passed).toBe(true)
      expect(log2.args.signedCount).toBe(3n)
    }
  }, 50_000)
})
