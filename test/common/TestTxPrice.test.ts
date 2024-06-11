import hardhat from 'hardhat'
import { deploy, execTx } from '../../lib/deploy-utils'
import { TestRandomSource__factory, TestTxPrice, TestTxPrice__factory } from '../../typechain-types'

describe('TestTxPrice.sol', () => {
  test('updateTxPrice', async () => {
    const signers = await hardhat.ethers.getSigners()
    const r = await deploy<TestTxPrice__factory>('TestTxPrice')
    const e18 = 10n ** 18n

    //
    {
      const [txPrice, transferGas] = await r.updateTxPrice.staticCall({ value: e18 })
      console.log({ txPrice, transferGas })
    }

    //
    {
      const feeData = await signers[0].provider.getFeeData()
      const gasPrice1=feeData!.gasPrice!;
      const gasPricex2 = gasPrice1 * 2n;

      const [txPrice, transferGas] = await r.updateTxPrice.staticCall({ value: e18, gasPrice: gasPricex2})
      console.log({ txPrice, transferGas, gasPrice1, gasPricex2 })
    }

    //
    {
        const feeData = await signers[0].provider.getFeeData()
        const gasPrice1 = feeData!.gasPrice!
        const gasPricex2 = gasPrice1 * 2n
        await execTx(()=>r.updateTxPrice({value:e18}));
        console.log({a:await r.get(), gasPrice1});
    }

  })
})
