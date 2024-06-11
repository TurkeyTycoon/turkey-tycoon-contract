import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import { MultiSignAdmin__factory, Referral__factory } from '../../typechain-types'
import { ZeroAddress, getAddress } from 'ethers'
import { mine } from '@nomicfoundation/hardhat-network-helpers'

describe('Referral.sol', () => {
  test('activeReferral', async () => {
    const signers = await hardhat.ethers.getSigners()
    const ss = signers.map((a) => a.address)
    console.log({chainId:hardhat.network.config.chainId!, chainName: hardhat.network.name, accounts: ss})
    const msa = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
    const msaAddr = await msa.getAddress()
    const m = await deploy<Referral__factory>('Referral', msaAddr)

    const refferalAddr = await m.getAddress()
    const root = refferalAddr

    // {
    //       const addrs = new Array(1000).fill(0).map((_v, i) => `0x${i.toString(16).padStart(40, '0')}`)
    //       await execTx(() => m.testAdd(addrs))
    //       const gas1 = await m.getAccountInfo.estimateGas(refferalAddr,0,1000);
    //       const accountInfo = await m.getAccountInfo(refferalAddr,0,1000)
    //       //expect(accountInfo.children.map((v) => v.toLowerCase())).toStrictEqual(addrs)
          
    //       await execTx(() => m.testAdd(addrs))
    //       await execTx(() => m.testAdd(addrs))
    //       const gas2 = await m.getAccountInfo.estimateGas(refferalAddr,0,10)
    //       const accountInfo2 = await m.getAccountInfo(refferalAddr,0,10)

    //       console.log({ gas1, gas2, len1: accountInfo.children.length, len2: accountInfo2.children.length, accountInfo2 })
    // }

    await msa.addCaller(refferalAddr)

    await expect(m.activeReferral(ss[0])).rejects.toThrow('ReferSelf')
    const blockNumber = await signers[0].provider.getBlockNumber()
    await m.setRootDeadlineBlockNumber(blockNumber + 3600 * 24 * 7)
    await expect(() => m.connect(signers[8]).activeReferral(ZeroAddress)).rejects.toThrow('InvalidReferrer')
    await expect(() => m.connect(signers[9]).activeReferral(ZeroAddress)).rejects.toThrow('InvalidReferrer')
    await m.connect(signers[8]).activeReferral(root)
    await m.connect(signers[4]).activeReferral(ss[8])
    await m.connect(signers[3]).activeReferral(ss[4])
    await m.connect(signers[2]).activeReferral(ss[4])
    await m.connect(signers[1]).activeReferral(ss[2])
    await m.activeReferral(ss[2])
    await expect(() => m.activeReferral(ss[1])).rejects.toThrow('AlreadyActivated')

    await mine(3600 * 24 * 7 + 100)
    await expect(()=>m.connect(signers[9]).activeReferral(root)).rejects.toThrow('InvalidReferrer');

    const refs = await Promise.all([
      m.referrals(ss[0]),
      m.referrals(ss[1]),
      m.referrals(ss[2]),
      m.referrals(ss[3]),
      m.referrals(ss[4]),
      m.referrals(ss[5]),
      m.referrals(ss[8]),
      m.referrals(ss[9])
    ])
    expect(refs).toStrictEqual([ss[2],ss[2],ss[4],ss[4],ss[8],ZeroAddress,root,ZeroAddress])

  }, 500_000)
})
