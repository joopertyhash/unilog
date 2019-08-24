import assertRevert from './helpers/assertRevert'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const UniswapEx = artifacts.require('UniswapEx')
const ERC20 = artifacts.require('FakeERC20')
const FakeUniswapFactory = artifacts.require('FakeUniswapFactory')
const UniswapFactory = artifacts.require('UniswapFactory')
const UniswapExchange = artifacts.require('UniswapExchange')

contract('UniswapEx', function ([_, owner, user, anotherUser, hacker]) {
  // globals
  const zeroAddress = '0x0000000000000000000000000000000000000000'
  const fromOwner = { from: owner }
  const fromUser = { from: user }
  const fromAnotherUser = { from: anotherUser }
  const fromHacker = { from: hacker }

  const never = new BN(256).pow(new BN(255));

  const creationParams = {
    ...fromOwner,
    gas: 6e6,
    gasPrice: 21e9
  }

  // Contracts
  let token1
  let token2
  let uniswapEx
  let uniswapFactory
  let uniswapToken1
  let uniswapToken2

  beforeEach(async function () {
    // Create tokens
    token1 = await ERC20.new(creationParams)
    token2 = await ERC20.new(creationParams)
    uniswapEx = await UniswapEx.new(creationParams)
    // Deploy Uniswap
    uniswapFactory = await UniswapFactory.at((await FakeUniswapFactory.new()).address);
    await uniswapFactory.createExchange(token1.address);
    await uniswapFactory.createExchange(token2.address);
    uniswapToken1 = await UniswapExchange.at(await uniswapFactory.getExchange(token1.address));
    uniswapToken2 = await UniswapExchange.at(await uniswapFactory.getExchange(token2.address));
  })

  describe('Constructor', function () {
    it('should be depoyed', async function () {
      const contract = await UniswapEx.new(creationParams)

      expect(contract).to.not.be.equal(zeroAddress)
    })
  })
  describe('It should trade on Uniswap', async () => {
    it('should execute buy tokens with ETH', async () => {
      // Add liquidity to Uniswap exchange
      await token1.setBalance(new BN(10000), owner);
      uniswapToken1.addLiquidity(0, new BN(10000), never, { from: owner, value: new BN(5000) });
    });
  });
})
