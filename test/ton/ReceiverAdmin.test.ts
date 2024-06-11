import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import { MultiSignAdmin__factory, ReceiverAdmin__factory } from '../../typechain-types'

describe('ReceiverAdmin.sol', () => {
  test('ReceiverAdminTest', async () => {
    const signers = await hardhat.ethers.getSigners()
    const sender = signers[0].address
    const ss = signers.map((s) => s.address)

    const m = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
    const a = await deploy<ReceiverAdmin__factory>('ReceiverAdmin', await m.getAddress())
    const aAddr = await a.getAddress()

    const a1= a.connect(signers[1]);
    {
      await expect(() => execTx(() => a.addReceiver(ss[0]))).rejects.toThrow('CallerNotInList')
      await expect(() => execTx(() => a.addReceivers(ss))).rejects.toThrow('CallerNotInList')
      await expect(() => execTx(() => a.removeReceiver(ss[0]))).rejects.toThrow('CallerNotInList')
      await expect(() => execTx(() => a.removeReceivers(ss))).rejects.toThrow('CallerNotInList')
      await expect(() => execTx(() => a.renounceOwnership())).rejects.toThrow('CallerNotInList')
      await expect(() => execTx(() => a.transferOwnership(sender))).rejects.toThrow('CallerNotInList')

      await execTx(() => m.addCaller(aAddr))
      await expect(() => execTx(() => a1.addReceiver(ss[0]))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => a1.addReceivers(ss))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => a1.removeReceiver(ss[0]))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => a1.removeReceivers(ss))).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => a1.renounceOwnership())).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => execTx(() => a1.transferOwnership(sender))).rejects.toThrow('MsgSenderNotSigner')

      await execTx(() => a.addReceiver(ss[0]))
      await execTx(() => a.addReceivers(ss.slice(1)))
      const [rs, count, c0, ic0 ] = await Promise.all([
        a.getReceivers(),
        a.getReceiverCount(),
        a.getReceiverAt(0),
        a.isReceiver(ss[0]),
      ]);
      expect([...rs].sort()).toStrictEqual([...ss].sort());
      expect(count).toBe(BigInt(ss.length));
      expect(c0).toBe(ss[0]);
      expect(ic0).toBe(true);
    }

    {
      await execTx(() => a.removeReceiver(ss[0]))
      await execTx(() => a.removeReceivers(ss.slice(1)))
      const [rs, count, ic0] = await Promise.all([
        a.getReceivers(),
        a.getReceiverCount(),
        a.isReceiver(ss[0])
      ])
      expect([...rs].sort()).toStrictEqual([])
      expect(count).toBe(0n)
      expect(ic0).toBe(false)
    }

  }, 50_000)
})
