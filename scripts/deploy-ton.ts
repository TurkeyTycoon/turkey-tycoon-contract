import hardhat from 'hardhat'
import { deploy, execTx } from '../lib/deploy-utils'
import {
  Airdrop,
  Airdrop2__factory,
  Airdrop__factory,
  FairMint__factory,
  TMARS__factory,
  MarsStakePoint__factory,
  MarsStake__factory,
  MockPriceFeeder__factory,
  MultiSignAdmin,
  MultiSignAdmin__factory,
  ReceiverAdmin__factory,
  Referral__factory
} from '../typechain-types'
import { ZeroAddress } from 'ethers'

async function deployPriceFeeder(msa: MultiSignAdmin) {
  const msaAddr = await msa.getAddress()
  const signers = await hardhat.ethers.getSigners()
  // Base Mainnet
  if (hardhat.network.config.chainId === 0x2105) {
    return MockPriceFeeder__factory.connect('0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', signers[0])
  }

  const priceFeeder = await deploy<MockPriceFeeder__factory>('MockPriceFeeder', msaAddr)
  const priceFeederAddr = await priceFeeder.getAddress()
  const isCaller = await msa.isCaller(priceFeederAddr)
  if (!isCaller) {
    await msa.addCaller(priceFeederAddr)
  }
  if (hardhat.network.config.chainId === 0x2105) {
    //  const realOracle=MockPriceFeeder__factory.connect('0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70', signers[0]);
    //  const lastAnswer=await realOracle.latestAnswer();
    //  await execTx(()=>priceFeeder.setAnswer(lastAnswer));
  }
  return priceFeeder
}

async function getUniswapPositionManagerAddr() {
  //Base Mainnet
  if (hardhat.network.config.chainId === 0x2105) {
    return '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1'
  }
  return ZeroAddress
}

async function deployTon() {
  const signers = await hardhat.ethers.getSigners()
  const provider = signers[0].provider
  const ss = signers.map((a) => a.address)
  const e18 = 10n ** 18n
  const e9 = 10n ** 9n
  console.log(ss)

  const msa = await deploy<MultiSignAdmin__factory>('MultiSignAdmin')
  const msaAddr = await msa.getAddress()
  const referral = await deploy<Referral__factory>('Referral', msaAddr)
  const ethReceiverAdmin = await deploy<ReceiverAdmin__factory>('ReceiverAdmin', msaAddr)
  const marsToken = await deploy<TMARS__factory>('TMARS', msaAddr)
  //const pointToken = await deploy<MarsStakePoint__factory>('MarsStakePoint', msaAddr)
  const priceFeeder = await deployPriceFeeder(msa)

  const [referralAddr, receiverAdminAddr, marsTokenAddr, pointTokenAddr, priceFeederAddr, uniswapPositionManagerAddr] =
    await Promise.all([
      referral.getAddress(),
      ethReceiverAdmin.getAddress(),
      marsToken.getAddress(),
      ZeroAddress,
      priceFeeder.getAddress(),
      getUniswapPositionManagerAddr()
    ])

  const fairMint = await deploy<FairMint__factory>(
    'FairMint',
    marsTokenAddr,
    priceFeederAddr,
    receiverAdminAddr,
    uniswapPositionManagerAddr,
    msaAddr
  )
  const marsStake = await deploy<MarsStake__factory>('MarsStake', marsTokenAddr, msaAddr)
  const [fairMintAddr, marsStakeAddr] = await Promise.all([fairMint.getAddress(), marsStake.getAddress()])
  const airdrop = await deploy<Airdrop__factory>('Airdrop', fairMintAddr, msaAddr)
  const airdropAddr = await airdrop.getAddress()

  const airdrop2 = await deploy<Airdrop2__factory>('Airdrop2', marsTokenAddr, msaAddr)
  const airdrop2Addr = await airdrop2.getAddress()

  await execTx(() =>
    msa.addCallers([
      referralAddr,
      fairMintAddr,
      marsStakeAddr,
      receiverAdminAddr,
      marsTokenAddr,
      airdropAddr,
      airdrop2Addr
    ])
  )

  const latestBlock = await provider.getBlock('latest')
  const t1 = (Date.parse('2024-06-17T00:00:00Z') / 1000) | 0
  const t2 = (Date.parse('2024-06-21T00:00:00Z') / 1000) | 0
  await execTx(() => referral.setRootStartBlockNumber(latestBlock!.number + ((t1 - latestBlock!.timestamp) >> 1)))
  await execTx(() => referral.setRootDeadlineBlockNumber(latestBlock!.number + ((t2 - latestBlock!.timestamp) >> 1)))

  await execTx(() => marsToken.addAdmin(fairMintAddr))
  await execTx(() => marsToken.addAdmin(airdropAddr))

  await execTx(() => fairMint.setReferral(referralAddr))
  await execTx(() => marsStake.setReferral(referralAddr))

  // await execTx(() => airdrop.setSignerAddress('0xrequired'))
  // await execTx(() => airdrop2.setSignerAddress('0xrequired'))
  // await execTx(() => airdrop2.setAirdropTokenSender('0xrequired'))
  // await execTx(() => ethReceiverAdmin.addReceivers([]))
  // await execTx(() => msa.setRatio(1, 3))
  // await execTx(() => msa.addSigners([]))

  console.log({
    totalGasUsed: globalThis.totalGasUsed,
    totalFee: globalThis.totalFee,
    avgGasPrice: Number((globalThis.totalFee * e18) / globalThis.totalGasUsed) / 1e9
  })
}

deployTon()
