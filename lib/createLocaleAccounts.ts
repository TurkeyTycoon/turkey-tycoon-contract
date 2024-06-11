import { Wallet } from 'ethers'
import { existsSync, writeFileSync, readFileSync } from 'fs'

export function createLocaleCounts(namePrefix: string) {
  const accounts = []
  for (let i = 0; i < 20; i++) {
    const wallet = Wallet.createRandom()
    accounts.push({
      name: `${namePrefix}${('' + i).padStart(2, '0')}`,
      address: wallet.address,
      privateKey: wallet.privateKey
    })
  }
  return accounts
}

export function getLocaleCounts(namePrefix: string):ReturnType<typeof createLocaleCounts> {
  const file = `${namePrefix}_accounts.json`
  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, 'utf8'))
  } else {
    const accounts = createLocaleCounts(namePrefix)
    writeFileSync(file, JSON.stringify(accounts))
    return accounts;
  }
}
