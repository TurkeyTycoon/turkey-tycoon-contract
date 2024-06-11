import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import { TestRandomSource__factory } from '../../typechain-types'

describe('TestRandomSource.sol', () => {
  test('lastRandom1', async () => {
    const signers = await hardhat.ethers.getSigners()
    const r = await deploy<TestRandomSource__factory>('TestRandomSource')

    const [a1,b1] = await r.testUpdateRandom.staticCall();
    await r.testUpdateRandom()
    const r1 = await r.lastRandom1()
    const r2 = await r.lastRandom2()
    console.log({a1,b1},{r1, r2})
  })
});