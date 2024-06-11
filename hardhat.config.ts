import 'dotenv/config'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-network-helpers'
import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-verify'
import '@typechain/hardhat'
import 'hardhat-contract-sizer'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

import { getLocaleCounts } from './lib/createLocaleAccounts'

declare global {
  var totalGasUsed: bigint
  var totalFee: bigint
}

const locAccounts = getLocaleCounts('tonloc');

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      evmVersion: 'paris',
      optimizer: {
        enabled: true,
        runs: 2000
      }
    }
  },
  contractSizer: {
    runOnCompile: true,
    strict: true,
    alphaSort: true
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 127001,
      // mining: {
      //   //auto: false,
      //   interval: 1000,
      // },
      accounts: locAccounts.map(({privateKey}) => ({ privateKey, balance: 10n ** 22n + '' }))
    },
    localhost: {
      chainId: 127001,
      url: 'http://localhost:8545/',
      accounts: locAccounts.map(p=>p.privateKey)
    },
    baseSepolia: {
      chainId: 0x14a34, //84532
      url: 'https://sepolia.base.org',
      accounts: [locAccounts[0].privateKey]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ''
  }
}

export default config
