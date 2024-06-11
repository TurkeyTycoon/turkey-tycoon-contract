import { JsonRpcProvider, TransactionReceipt, TransactionResponse } from 'ethers'
import { FairMint__factory } from '../../typechain-types'
import { MintFailedEvent, MintSuccessEvent, PremintedEvent } from '../../typechain-types/contracts/ton/FairMint'

import { writeFileSync } from 'fs'

type Premint = {
  msgSender: string
  confirmBlockNumber: bigint
  extraGasFee: bigint
  confirmGasFee: bigint
  expectMintAmount: bigint
  value: bigint
  refund: bigint
  fee: bigint
  txHash: string
  logIndex: number
  blockNumber: number
}
type MintSucc = {
  premintMsgSender: string
  extraGasFee: bigint
  tokenAmount: bigint
  confirmGasFee: bigint
  fee: bigint
  txHash: string
  logIndex: number
  blockNumber: number
}

type MintFailed = {
  deductedEth: bigint
  extraGasFee: bigint
  confirmGasFee: bigint
  fee: bigint
  txHash: string
  logIndex: number
  blockNumber: number
}

type Tx = {
  from: string
  fee: bigint
  value: bigint
  gasUsed: bigint
}

function createUser() {
  return {
    premints: [] as Premint[],
    premintInfo: {
      count: 0,
      extraGasFee: 0n,
      confirmGasFee: 0n,
      expectMintAmount: 0n,
      value: 0n,
      refund: 0n,
      fee: 0n
    },

    succMints: [] as MintSucc[],
    succMintInfo: {
      count: 0,
      tokenAmount: 0n,
      extraGasFee: 0n
    },
    failedMints: [] as MintFailed[],
    failedMintInfo: {
      count: 0,
      deductedEth: 0n
    },

    confirmMintInfo: {
      premintCount: 0,
      mintSuccCount: 0,
      mintFailedCount: 0,

      payGasFee: 0n,
      receivedConfirmGasFee: 0n
    }
  }
}
type User = ReturnType<typeof createUser>
type Data = {
  fairMint: string
  from: number
  to: number

  premintCount: number
  mintSuccCount: number
  mintFailedCount: number
  userCount: number
  txCount: number

  totalValue: bigint
  totalRefund: bigint
  totalPayConfirmGas: bigint
  totalSendToAdmin: bigint
  totalFailedRefund: bigint
  totalMintedMars: bigint
  lastBalance: bigint

  users: Record<string, User>
  logKeys: Record<string, number>
  txs: Record<string, Tx>
  logRemoved: string[]
  failedTxs: string[]
  fairMintBalances: Record<number, bigint>
}

function createData(fAddr: string): Data {
  return {
    fairMint: fAddr,
    from: 0,
    to: 0,

    premintCount: 0,
    mintSuccCount: 0,
    mintFailedCount: 0,
    userCount: 0,
    txCount: 0,

    totalValue: 0n,
    totalRefund: 0n,
    totalFailedRefund: 0n,
    totalPayConfirmGas: 0n,
    totalSendToAdmin: 0n,
    totalMintedMars: 0n,
    lastBalance: 0n,

    users: {},
    logKeys: {},
    txs: {},
    logRemoved: [],
    failedTxs: [],

    fairMintBalances: {}
  }
}

describe('FairMintDataCheck', () => {
  test('DataCheck', async () => {
    const network = { name: 'baseSepolia', chainId: 0x14a34, url: 'https://sepolia.base.org' }
    const fAddr = '0xf386d6DCd8FC8941d6A01A64c2f268A082C1533A'
    const provider = new JsonRpcProvider(network.url)
    const startBlockNumber = 7656153 
    const endBlockNumber = await provider.getBlockNumber()
    const f = FairMint__factory.connect(fAddr, provider)

    expect(await f.getPremintCount()).toBe(0n)

    const premintTopicHash = f.filters.Preminted.fragment.topicHash
    const mintSuccTopicHash = f.filters.MintSuccess.fragment.topicHash
    const mintFailedTopicHash = f.filters.MintFailed.fragment.topicHash

    console.log({
      address: fAddr,
      premintTopicHash,
      mintSuccTopicHash,
      mintFailedTopicHash,
      startBlockNumber,
      endBlockNumber,
      network,
      filterEvents: [f.filters.Preminted.name, f.filters.MintSuccess.name, f.filters.MintFailed.name]
    })

    const data = createData(fAddr)
    data.from = startBlockNumber

    let from = startBlockNumber
    while (from < endBlockNumber) {
      let to = Math.min(from + 2000, endBlockNumber)
      data.to = to

      const logs = await provider.getLogs({
        fromBlock: from,
        toBlock: to,
        address: fAddr,
        topics: [[premintTopicHash, mintSuccTopicHash, mintFailedTopicHash]]
      })

      console.log(
        `getLogs from ${from} - to ${to} count:${logs.length} process: ${
          ((to - startBlockNumber) * 100) / (endBlockNumber - startBlockNumber)
        }%`
      )

      const txs: Record<string, TransactionResponse> = {}
      const trs: Record<string, TransactionReceipt> = {}

      const txHashs = [...new Set(logs.map((log) => log.transactionHash))]

      for (let i = 0; i < txHashs.length; i += 10) {
        await Promise.all(txHashs.slice(i, i + 10).map((h) => provider.getTransaction(h).then((tx) => (txs[h] = tx!))))
        await Promise.all(
          txHashs.slice(i, i + 10).map((h) => provider.getTransactionReceipt(h).then((tr) => (trs[h] = tr!)))
        )
        console.log(`-- load tx and receipt i: ${i} len: ${txHashs.length}  ${((i + 10) * 100) / txHashs.length}% --`)
      }

      // const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))]
      // for (let i = 0; i < blockNumbers.length; i += 10) {
      //   await Promise.all(
      //     blockNumbers
      //       .slice(i, i + 10)
      //       .map((n) => [
      //         provider.getBalance(fAddr, n).then((b) => (data.fairMintBalances[n] = b)),
      //         provider.getBalance(fAddr, n - 1).then((b) => (data.fairMintBalances[n - 1] = b))
      //       ])
      //       .flat()
      //   )
      //   console.log(
      //     `-- load balance of contract: ${i} len: ${blockNumbers.length}  ${((i + 10) * 100) / blockNumbers.length}% --`
      //   )
      // }

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i]

        const key = log.transactionHash + '#' + log.index
        if (data.logKeys[key]) {
          continue
        }
        data.logKeys[key] = 1

        const blockNumber = log.blockNumber
        const txHash = log.transactionHash
        const logIndex = log.index

        const tx = txs[txHash]
        const receipt = trs[txHash]
        if (receipt.status !== 1) {
          data.failedTxs.push(txHash)
          continue
        }

        if (log.removed) {
          data.logRemoved.push(key)
          continue
        }

        const { fee, gasUsed, from: fromUser } = receipt
        const value = tx.value
        data.txs[txHash] = { from: fromUser, value, fee, gasUsed }

        const e = f.interface.getEvent(log.topics[0] as any)
        const args = f.interface.decodeEventLog(e, log.data, log.topics)
        if (e.name == f.filters.Preminted.name) {
          const [msgSender, confirmBlockNumber, extraGasFee, confirmGasFee, expectMintAmount] =
            args as unknown as PremintedEvent.OutputTuple
          const u = data.users[msgSender] || createUser()
          data.users[msgSender] = u

          const pu = {
            msgSender,
            confirmBlockNumber,
            extraGasFee,
            confirmGasFee,
            expectMintAmount,
            value,
            refund: value - confirmGasFee - extraGasFee,
            fee,
            txHash,
            logIndex,
            blockNumber
          }
          u.premints.push(pu)
          const s = u.premintInfo
          s.count += 1
          s.extraGasFee += pu.extraGasFee
          s.confirmGasFee += pu.confirmGasFee
          s.expectMintAmount += pu.expectMintAmount
          s.value += pu.value
          s.refund += pu.refund
          s.fee += pu.fee
        } else if (e.name == f.filters.MintSuccess.name) {
          const [premintMsgSender, _token, tokenAmount, extraGasFee, confirmGasFee] =
            args as unknown as MintSuccessEvent.OutputTuple
          const u = data.users[premintMsgSender] || createUser()
          data.users[premintMsgSender] = u
          const pu = {
            premintMsgSender,
            extraGasFee,
            tokenAmount,
            confirmGasFee,
            fee,
            txHash,
            logIndex,
            blockNumber
          }
          u.succMints.push(pu)
          const s = u.succMintInfo
          s.count += 1
          s.tokenAmount += tokenAmount
          s.extraGasFee += extraGasFee

          //----
          const m = data.users[fromUser] || createUser()
          data.users[fromUser] = m
          const c = m.confirmMintInfo
          c.premintCount += 1
          c.mintSuccCount += 1
          c.payGasFee += fee
          c.receivedConfirmGasFee += confirmGasFee
        } else if (e.name == f.filters.MintFailed.name) {
          const [premintMsgSender, deductedEth, extraGasFee, confirmGasFee] =
            args as unknown as MintFailedEvent.OutputTuple

          const u = data.users[premintMsgSender] || createUser()
          data.users[premintMsgSender] = u
          const pu = {
            deductedEth,
            extraGasFee,
            confirmGasFee,
            fee,
            txHash,
            logIndex,
            blockNumber
          }
          u.failedMints.push(pu)
          const s = u.failedMintInfo
          s.count += 1
          s.deductedEth += deductedEth

          //----
          const m = data.users[fromUser] || createUser()
          data.users[fromUser] = m
          const c = m.confirmMintInfo
          c.mintFailedCount += 1
          c.payGasFee += fee
          c.receivedConfirmGasFee += confirmGasFee
        }
      }

      from = to + 1
    }

    Object.values(data.users).forEach((u) => {
      data.userCount += u.premints.length > 0 ? 1 : 0
      u.premints.forEach((p) => {
        data.premintCount += 1
        data.totalValue += p.value
        data.totalRefund += p.refund
        data.totalPayConfirmGas += p.confirmGasFee
      })

      u.succMints.forEach((p) => {
        data.mintSuccCount += 1
        data.totalMintedMars += p.tokenAmount
        data.totalSendToAdmin += p.extraGasFee - p.extraGasFee / 2n
      })

      u.failedMints.forEach((p) => {
        data.mintFailedCount += 1
        data.totalFailedRefund += p.extraGasFee - p.deductedEth
      })
    })

    data.txCount = Object.entries(data.txs).length
    data.lastBalance =
      data.totalValue - data.totalRefund - data.totalPayConfirmGas - data.totalSendToAdmin - data.totalFailedRefund

    writeFileSync(
      'checkMintData.json',
      JSON.stringify(data, (_key, value) => {
        if (typeof value == 'bigint') {
          return value + ''
        }
        return value
      })
    )
  }, 6000_000)
})
