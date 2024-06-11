import path from 'path'
import { mkdir, writeFile, readFile } from 'fs/promises'
import hardhat, { network } from 'hardhat'
import { ContractFactory, ContractTransactionReceipt, ContractTransactionResponse } from 'ethers'

import { builtinChains } from '@nomicfoundation/hardhat-verify/internal/chain-config'
export function isSupportVerify(chainId: number) {
  return builtinChains.some((c) => c.chainId === chainId)
}

export function isTestnet(chainId: number) {
  return ![56, 204].includes(chainId)
}

export function isOpbnb(chainId: number) {
  return chainId === 204 || chainId === 5611
}

export interface Deployment {
  network: string
  chainId?: number
  name: string
  address: string
  args: any[]
  encodedArgs: string
  gasUsed: string
}

export async function saveDeployment(
  name: string,
  address: string,
  args: any[] = [],
  encodedArgs: string = '',
  gasUsed: string = '',
  network = hardhat.network
) {
  const data: Deployment = {
    network: network.name,
    chainId: network.config.chainId,
    name,
    address,
    args,
    encodedArgs,
    gasUsed
  }
  const dir = path.join('deployments', network.name)
  await mkdir(dir, { recursive: true }).catch(() => void 0)
  const file = path.join(dir, name + '.json')
  await writeFile(file, JSON.stringify(data))
}

export async function readDeployment(name: string, network = hardhat.network) {
  const dir = path.join('deployments', network.name)
  const data = await readFile(path.join(dir, name + '.json'), 'utf-8')
  return JSON.parse(data) as Deployment
}

export async function getDeployedConstract<T extends ContractFactory>(name: string) {
  const { address } = await readDeployment(name)
  const factory = (await hardhat.ethers.getContractFactory(name)) as T
  return factory.attach(address) as ReturnType<T['attach']>
}

export async function verify(name: string, network = hardhat.network) {
  if (network.name !== 'hardhat' && isSupportVerify(network.config.chainId!)) {
    const { address, args } = await readDeployment(name, network)
    console.log(`-- verify ${name} ${address} --`)
    return await hardhat.run('verify:verify', {
      address,
      constructorArguments: args
    })
  }
}

export async function deploy<T extends ContractFactory>(name: string, ...args: Parameters<T['deploy']>) {
  const factory = (await hardhat.ethers.getContractFactory(name)) as T
  const isForce = false
  const forceSave = true

  if (!isForce && network.name !== 'hardhat') {
    const deployment = await readDeployment(name).catch(() => undefined)
    if (deployment) {
      if (JSON.stringify(deployment.args) === JSON.stringify(args)) {
        console.log(`used cached ${name} at ${deployment.address}`)
        return factory.attach(deployment.address) as ReturnType<T['deploy']>
      }
    }
  }

  let gasPrice = (await factory.runner!.provider!.getFeeData()).gasPrice!
  if (isOpbnb(network.config.chainId!)) {
    gasPrice = BigInt(1024)
  }
  const contract = await factory.deploy(...args, { gasPrice: gasPrice + (gasPrice >> BigInt(2)) })
  const receipt = await contract.deploymentTransaction()!.wait(1)
  const address = await contract.getAddress()

  console.log(`deployed ${name} at ${address} on ${hardhat.network.name}[${hardhat.network.config.chainId}]`)
  showReceipt(receipt as any)

  if (forceSave) {
    const encodedArgs = factory.interface.encodeDeploy(args)
    await saveDeployment(name, address, args, encodedArgs, receipt?.gasUsed + '')
    globalThis.totalGasUsed = (globalThis.totalGasUsed || 0n) + (receipt?.gasUsed || 0n)
    globalThis.totalFee = (globalThis.totalFee || 0n) + (receipt?.fee || 0n)

    if (isSupportVerify(network.config.chainId!)) {
      await verify(name, network).catch((err) => console.warn(`${name} Verify Error: ${err.message}`))
    }
  }
  return contract as ReturnType<T['deploy']>
}

export async function execTx<T extends any[] = []>(
  action: (...args: T) => Promise<ContractTransactionResponse>,
  title: string = '',
  ...args: T
) {
  title ||= action.toString()

  if (isOpbnb(network.config.chainId!) && !args.at(-1)?.gasPrice) {
    args.push({ gasPrice: 1024 })
  }

  console.log(title, ...args)
  try {
    const tx = await action(...args)
    console.log(`${title} tx:`, tx.hash)
    const receipt = await tx
      .wait(1)
      .catch((err) => ({ hash: tx.hash, blockNumber: tx.blockNumber, status: 0, error: err.message }))
    globalThis.totalGasUsed = (globalThis.totalGasUsed || 0n) + ((receipt as any)?.gasUsed || 0n)
    globalThis.totalFee = (globalThis.totalFee || 0n) + ((receipt as any)?.fee || 0n)
    showReceipt(receipt as any)
    return { tx, receipt }
  } catch (error: any) {
    console.log(`Error: ${error.message}`)
    throw error
  }
}

export function showReceipt(receipt: ContractTransactionReceipt & { error?: any }) {
  const { status, blockNumber, type, hash, from, to, gasUsed, gasPrice, cumulativeGasUsed, error } = receipt
  const info = {
    blockNumber,
    hash,
    status,
    type,
    gasUsed,
    gasPrice,
    cumulativeGasUsed,
    from,
    to,
    error
  }
  console.log(info)
}
