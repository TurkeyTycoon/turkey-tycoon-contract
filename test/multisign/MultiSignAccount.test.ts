import hardhat from 'hardhat'
import { deploy } from '../../lib/deploy-utils'
import {
  MultiSignAccount__factory,
  TestERC1155__factory,
  TestERC20__factory,
  TestERC721__factory
} from '../../typechain-types'
import { ZeroAddress } from 'ethers'

describe('MultiSignAccount.sol', () => {
  test('ethTest', async () => {
    const signers = await hardhat.ethers.getSigners()
    const ss = signers.map((s) => s.address)
    const p = signers[0].provider

    const m = await deploy<MultiSignAccount__factory>('MultiSignAccount')
    const mAddr = await m.getAddress()
    const u = await deploy<TestERC20__factory>('TestERC20', mAddr)
    const n = await deploy<TestERC721__factory>('TestERC721', mAddr)
    const k = await deploy<TestERC1155__factory>('TestERC1155', mAddr)
    const uAddr = await u.getAddress()
    const m1 = m.connect(signers[1])

    //
    {
      await expect(() => m1.transferETH(ss[2], 100n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => m1.transferERC20(ZeroAddress, ss[2], 100n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => m1.transferERC20From(ZeroAddress, ss[0], ss[2], 100n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => m1.transferERC721(ZeroAddress, ss[2], 100n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => m1.transferERC1155From(ZeroAddress, ss[0], ss[2], 1, 100, '0x')).rejects.toThrow(
        'MsgSenderNotSigner'
      )
      await expect(() =>
        m1.batchTransferERC1155From(ZeroAddress, ss[0], ss[2], [1, 2, 3], [100, 200, 300], '0x')
      ).rejects.toThrow('MsgSenderNotSigner')

      await expect(() => m1.approveERC20(ZeroAddress, ss[2], 100n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => m1.approveERC721(ZeroAddress, ss[2], 100n)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => m1.setApprovalERC721ForAll(ZeroAddress, ss[2], true)).rejects.toThrow('MsgSenderNotSigner')
      await expect(() => m1.setApprovalERC1155ForAll(ZeroAddress, ss[2], true)).rejects.toThrow('MsgSenderNotSigner')
    }

    //transferEth
    {
      const origEth = await p.getBalance(ss[1])
      const sendValue = origEth / 2n
      expect(await p.getBalance(mAddr)).toBe(0n)
      expect(sendValue).toBeGreaterThan(10n)
      const tx = await signers[1].sendTransaction({ to: mAddr, value: sendValue })
      const receipt = await tx.wait()
      expect(await p.getBalance(mAddr)).toBe(sendValue)
      expect(await p.getBalance(ss[1])).toBe(origEth - sendValue - receipt!.fee)
      await expect(() => m.transferETH(ss[2], sendValue * 100n)).rejects.toThrow()
      //
      {
        const transferValue = sendValue / 2n
        const ss2Eth = await p.getBalance(ss[2])
        await m.transferETH(ss[2], transferValue)
        expect(await p.getBalance(mAddr)).toBe(sendValue - transferValue)
        expect(await p.getBalance(ss[2])).toBe(ss2Eth + transferValue)
      }
    }

    //----ERC20----------------
    {
      const sendToken = (await u.balanceOf(ss[0])) / 2n
      const mAllowance = await u.allowance(mAddr, ss[0])
      expect(sendToken).toBeGreaterThan(10000n)
      expect(mAllowance).toBe(0n)
      expect(await u.balanceOf(mAddr)).toBe(0n)

      await u.transfer(mAddr, sendToken)
      expect(await u.balanceOf(mAddr)).toBe(sendToken)
      expect(await u.balanceOf(ss[0])).toBe(sendToken)

      expect(await u.balanceOf(ss[2])).toBe(0n)
      expect(await u.allowance(mAddr, ss[2])).toBe(0n)
      const transferToken = sendToken / 2n
      await m.transferERC20(uAddr, ss[2], transferToken)
      await m.approveERC20(uAddr, ss[2], transferToken)
      expect(await u.balanceOf(ss[2])).toBe(transferToken)
      expect(await u.allowance(mAddr, ss[2])).toBe(transferToken)
      expect(await u.balanceOf(mAddr)).toBe(sendToken - transferToken)

      await u.connect(signers[2]).transferFrom(mAddr, ss[2], transferToken)
      expect(await u.balanceOf(ss[2])).toBe(transferToken * 2n)
      expect(await u.balanceOf(mAddr)).toBe(0n)

      await u.approve(mAddr, sendToken * 1000n)
      await m.transferERC20From(uAddr, ss[0], ss[3], 2200n)
      expect(await u.balanceOf(ss[3])).toBe(2200n)
      expect(await u.allowance(ss[0], mAddr)).toBe(sendToken * 1000n - 2200n)
    }

    //-- ERC721
    {
      const nAddr = await n.getAddress()
      const count = await n.balanceOf(ss[0])
      expect(count).toBe(10n)
      expect(await n.ownerOf(1n)).toBe(ss[0])
      expect(await n.ownerOf(2n)).toBe(ss[0])
      expect(await n.ownerOf(3n)).toBe(ss[0])
      expect(await n.ownerOf(4n)).toBe(ss[0])
      expect(await n.ownerOf(5n)).toBe(ss[0])
      expect(await n.ownerOf(6n)).toBe(ss[0])
      expect(await n.ownerOf(7n)).toBe(ss[0])
      expect(await n.ownerOf(8n)).toBe(ss[0])
      expect(await n.ownerOf(9n)).toBe(ss[0])
      expect(await n.ownerOf(10n)).toBe(ss[0])
      expect(await n.balanceOf(mAddr)).toBe(0n)

      await n.transferFrom(ss[0], mAddr, 1n)
      await n.transferFrom(ss[0], mAddr, 2n)
      await n.transferFrom(ss[0], mAddr, 3n)
      await n.transferFrom(ss[0], mAddr, 4n)
      await n.transferFrom(ss[0], mAddr, 5n)
      await n.transferFrom(ss[0], mAddr, 6n)
      await n.setApprovalForAll(mAddr, true)

      expect(await n.ownerOf(1n)).toBe(mAddr)
      expect(await n.ownerOf(2n)).toBe(mAddr)
      expect(await n.balanceOf(mAddr)).toBe(6n)

      await m.transferERC721(nAddr, ss[1], 1n)
      await m.transferERC721(nAddr, ss[1], 2n)
      await m.transferERC721(nAddr, ss[1], 7n)

      expect(await n.ownerOf(1n)).toBe(ss[1])
      expect(await n.ownerOf(2n)).toBe(ss[1])
      expect(await n.ownerOf(7n)).toBe(ss[1])
      expect(await n.balanceOf(ss[1])).toBe(3n)
      expect(await n.balanceOf(mAddr)).toBe(4n)

      await m.approveERC721(nAddr, ss[1], 3n)
      await n.connect(signers[1]).transferFrom(mAddr, ss[1], 3n)
      expect(await n.ownerOf(3n)).toBe(ss[1])
      expect(await n.balanceOf(ss[1])).toBe(4n)
      expect(await n.balanceOf(mAddr)).toBe(3n)

      await m.setApprovalERC721ForAll(nAddr, ss[2], true)
      await n.connect(signers[2]).transferFrom(mAddr, ss[2], 4n)
      expect(await n.ownerOf(4n)).toBe(ss[2])
      expect(await n.balanceOf(ss[2])).toBe(1n)
      expect(await n.balanceOf(mAddr)).toBe(2n)
    }

    // -- ERC1155
    {
      const kAddr = await k.getAddress()
      expect(await k.balanceOf(ss[0], 1n)).toBe(10000n)
      expect(await k.balanceOf(ss[0], 10n)).toBe(10000n)
      await k.safeTransferFrom(ss[0], mAddr, 1n, 2000n, '0x')
      expect(await k.balanceOf(ss[0], 1n)).toBe(8000n)
      expect(await k.balanceOf(mAddr, 1n)).toBe(2000n)
      await (await k.safeBatchTransferFrom(ss[0], mAddr, [2n, 3n, 4n, 5n], [2000n, 2000n, 2000n, 2000n], '0x')).wait()
      expect(await k.balanceOf(mAddr, 2n)).toBe(2000n)
      expect(await k.balanceOf(mAddr, 3n)).toBe(2000n)
      expect(await k.balanceOf(mAddr, 4n)).toBe(2000n)
      expect(await k.balanceOf(mAddr, 5n)).toBe(2000n)

      await m.transferERC1155From(kAddr, mAddr, ss[2], 1, 1000, '0x')
      expect(await k.balanceOf(ss[2], 1n)).toBe(1000n)
      expect(await k.balanceOf(mAddr, 1n)).toBe(1000n)

      await m.batchTransferERC1155From(kAddr, mAddr, ss[2], [2, 3], [100, 100], '0x')
      expect(await k.balanceOf(ss[2], 2n)).toBe(100n)
      expect(await k.balanceOf(mAddr, 2n)).toBe(1900n)
      expect(await k.balanceOf(ss[2], 3n)).toBe(100n)
      expect(await k.balanceOf(mAddr, 3n)).toBe(1900n)

      await k.setApprovalForAll(mAddr, true)
      await m.batchTransferERC1155From(kAddr, ss[0], ss[3], [6, 7], [100, 100], '0x')
      expect(await k.balanceOf(ss[3], 6n)).toBe(100n)
      expect(await k.balanceOf(ss[0], 6n)).toBe(9900n)
      expect(await k.balanceOf(ss[3], 7n)).toBe(100n)
      expect(await k.balanceOf(ss[0], 7n)).toBe(9900n)

      await m.setApprovalERC1155ForAll(kAddr, ss[4], true)
      await k.connect(signers[4]).safeBatchTransferFrom(mAddr, ss[5], [2, 3], [100, 100], '0x')
      expect(await k.balanceOf(ss[5], 2n)).toBe(100n)
      expect(await k.balanceOf(mAddr, 2n)).toBe(1800n)
      expect(await k.balanceOf(ss[5], 3n)).toBe(100n)
      expect(await k.balanceOf(mAddr, 3n)).toBe(1800n)
    }
  })
})
