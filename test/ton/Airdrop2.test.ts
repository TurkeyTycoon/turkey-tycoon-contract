import hardhat from 'hardhat'
import { deploy } from '../../lib/deploy-utils'
import { Airdrop2__factory, Airdrop__factory, TMARS__factory, MultiSignAdmin__factory } from '../../typechain-types'
import { JsonRpcProvider, MaxUint256, TypedDataDomain, Wallet } from 'ethers'

describe('Airdrop2.sol', () => {
  test('airdrop2', async () => {
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

    const airdrop2 = await deploy<Airdrop2__factory>('Airdrop2', marsTokenAddr, msaAddr)
    const airdrop2Addr = await airdrop2.getAddress()
    await msa.addCallers([airdrop2Addr, marsTokenAddr])

    //signature
    {
      const timestamp = (await provider.getBlock('latest'))?.timestamp!
      const totalReleased = 3n * e18
      const domain: TypedDataDomain = {
        name: 'Airdrop2',
        version: '1.0',
        chainId: hardhat.network.config.chainId + '',
        verifyingContract: airdrop2Addr
      }

      const dataTypes = {
        Data: [
          { name: 'signer', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'airdropToken', type: 'address' },
          { name: 'timestamp', type: 'uint64' },
          { name: 'totalReleased', type: 'uint256' }
        ]
      }
      const data = {
        signer: ss[0],
        receiver: ss[8],
        airdropToken: marsTokenAddr,
        timestamp: timestamp + '',
        totalReleased
      }

      const a0 = airdrop2
      const a1 = airdrop2.connect(signers[1])
      const a4 = airdrop2.connect(signers[4])
      const a8 = airdrop2.connect(signers[8])

      const signature8 = await signers[0].signTypedData(domain, dataTypes, data)
      const verified8 = await airdrop2.checkSignature(ss[8], timestamp!, totalReleased, signature8)
      expect(verified8).toBe(true)

      await expect(() => a8.collectAirdrop2(timestamp!, totalReleased, signature8)).rejects.toThrow('NotEnabled()')
      await airdrop2.setEnabled(true)
      await expect(() => a8.collectAirdrop2(timestamp!, totalReleased, signature8)).rejects.toThrow(
        'ERC20InsufficientAllowance'
      )
      await marsToken.approve(airdrop2Addr, totalReleased)
      await airdrop2.setAirdropTokenSender(ss[0])
      await expect(() => a8.collectAirdrop2(timestamp!, totalReleased, signature8)).rejects.toThrow(
        'ERC20InsufficientBalance'
      )
      await marsToken.mint(ss[0], totalReleased)

      const b8 = await marsToken.balanceOf(ss[8])
      await a8.collectAirdrop2(timestamp!, totalReleased, signature8)
      expect(await marsToken.balanceOf(ss[8])).toBe(b8 + (await a8.collectedAmounts(ss[8])))


      await marsToken.approve(airdrop2Addr, MaxUint256)
      await marsToken.mint(ss[0], totalReleased * 100n)

      const signature4 = await signers[0].signTypedData(domain, dataTypes, { ...data, receiver: ss[4] })
      console.log('--signTypedData--', { domain, dataTypes, data, signature4 })
      const b4 = await marsToken.balanceOf(ss[4])
      await a4.collectAirdrop2(timestamp!, totalReleased, signature4)
      expect(await marsToken.balanceOf(ss[4])).toBe(b4 + (await a4.collectedAmounts(ss[4])))

      const signature0 = await signers[0].signTypedData(domain, dataTypes, { ...data, receiver: ss[0] })
      await a0.collectAirdrop2(timestamp!, totalReleased, signature0)
      console.log('--signTypedData--', { domain, dataTypes, data, signature0 })
      await expect(() => a0.collectAirdrop2(timestamp!, totalReleased, signature0)).rejects.toThrow(
        'InsufficientAvailableAmount'
      )
      await expect(() => a0.collectAirdrop2(timestamp!, totalReleased, signature4)).rejects.toThrow('InvalidSignature')
      await expect(() => a0.collectAirdrop2(timestamp + 2, totalReleased, signature0)).rejects.toThrow(
        'InvalidSignature'
      )
      

      const signature1 = await signers[0].signTypedData(domain, dataTypes, {
        ...data,
        timestamp: timestamp - 3600 * 72,
        receiver: ss[1]
      })

      expect(await a1.checkSignature(ss[1], timestamp - 3600 * 72, totalReleased, signature1)).toBe(true)
      await expect(() => a1.collectAirdrop2(timestamp - 3600 * 72, totalReleased, signature0)).rejects.toThrow(
        'SignatureExpired'
      )
    }
  }, 50_000)
})
