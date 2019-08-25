import React, { useState, useReducer, useEffect } from 'react'
import ReactGA from 'react-ga'

import { useTranslation } from 'react-i18next'
import { useWeb3Context } from 'web3-react'

import { ethers } from 'ethers'
import styled from 'styled-components'

import { Button } from '../../theme'
import CurrencyInputPanel from '../CurrencyInputPanel'
import OversizedPanel from '../OversizedPanel'
import ArrowDown from '../../assets/svg/SVGArrowDown'
import { amountFormatter } from '../../utils'
import { useUniswapExContract } from '../../hooks'
import { useTokenDetails } from '../../contexts/Tokens'
import { useTransactionAdder } from '../../contexts/Transactions'
import { useAddressBalance, useExchangeReserves } from '../../contexts/Balances'
import { useFetchAllBalances } from '../../contexts/AllBalances'
import { useAddressAllowance } from '../../contexts/Allowances'

import './ExchangePage.css'

let inputValue
let hasFetchedOrders
let orders = []

const INPUT = 0
const OUTPUT = 1

const ETH_TO_TOKEN = 0
const TOKEN_TO_ETH = 1
const TOKEN_TO_TOKEN = 2

// denominated in bips
const ALLOWED_SLIPPAGE_DEFAULT = 100
const TOKEN_ALLOWED_SLIPPAGE_DEFAULT = 100

const ETHER_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const UNISWAP_EX_TRANSFER_TX_LENGTH = 138

const DownArrowBackground = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  justify-content: center;
  align-items: center;
`

const WrappedArrowDown = ({ clickable, active, ...rest }) => <ArrowDown {...rest} />
const DownArrow = styled(WrappedArrowDown)`
  color: ${({ theme, active }) => (active ? theme.royalBlue : theme.chaliceGray)};
  width: 0.625rem;
  height: 0.625rem;
  position: relative;
  padding: 0.875rem;
  cursor: ${({ clickable }) => clickable && 'pointer'};
`

const ExchangeRateWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  align-items: center;
  color: ${({ theme }) => theme.doveGray};
  font-size: 0.75rem;
  padding: 0.5rem 1rem;
`

const ExchangeRate = styled.span`
  flex: 1 1 auto;
  width: 0;
  color: ${({ theme }) => theme.doveGray};
`

const Flex = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;

  button {
    max-width: 20rem;
  }
`

function calculateSlippageBounds(value, token = false, tokenAllowedSlippage, allowedSlippage) {
  if (value) {
    const offset = value.mul(token ? tokenAllowedSlippage : allowedSlippage).div(ethers.utils.bigNumberify(10000))
    const minimum = value.sub(offset)
    const maximum = value.add(offset)
    return {
      minimum: minimum.lt(ethers.constants.Zero) ? ethers.constants.Zero : minimum,
      maximum: maximum.gt(ethers.constants.MaxUint256) ? ethers.constants.MaxUint256 : maximum
    }
  } else {
    return {}
  }
}

function getSwapType(inputCurrency, outputCurrency) {
  if (!inputCurrency || !outputCurrency) {
    return null
  } else if (inputCurrency === 'ETH') {
    return ETH_TO_TOKEN
  } else if (outputCurrency === 'ETH') {
    return TOKEN_TO_ETH
  } else {
    return TOKEN_TO_TOKEN
  }
}

// this mocks the getInputPrice function, and calculates the required output
// updateInputValue is hack to detach output input from output
function calculateEtherTokenOutputFromInput(inputAmount, inputReserve, outputReserve, updateInputValue = true) {
  const inputAmountWithFee = inputAmount.mul(ethers.utils.bigNumberify(997))
  const numerator = inputAmountWithFee.mul(outputReserve)
  const denominator = inputReserve.mul(ethers.utils.bigNumberify(1000)).add(inputAmountWithFee)
  if (updateInputValue) {
    inputValue = inputAmount
  }
  return numerator.div(denominator)
}

// this mocks the getOutputPrice function, and calculates the required input
function calculateEtherTokenInputFromOutput(outputAmount, inputReserve, outputReserve) {
  const numerator = inputReserve.mul(outputAmount).mul(ethers.utils.bigNumberify(1000))
  const denominator = outputReserve.sub(outputAmount).mul(ethers.utils.bigNumberify(997))
  return numerator.div(denominator).add(ethers.constants.One)
}

function getInitialSwapState(outputCurrency) {
  return {
    independentValue: '', // this is a user input
    dependentValue: '', // this is a calculated number
    independentField: INPUT,
    inputCurrency: 'ETH',
    outputCurrency: outputCurrency ? outputCurrency : ''
  }
}

function swapStateReducer(state, action) {
  switch (action.type) {
    case 'FLIP_INDEPENDENT': {
      const { independentField, inputCurrency, outputCurrency } = state
      return {
        ...state,
        dependentValue: '',
        independentField: independentField === INPUT ? OUTPUT : INPUT,
        inputCurrency: outputCurrency,
        outputCurrency: inputCurrency
      }
    }
    case 'SELECT_CURRENCY': {
      const { inputCurrency, outputCurrency } = state
      const { field, currency } = action.payload

      const newInputCurrency = field === INPUT ? currency : inputCurrency
      const newOutputCurrency = field === OUTPUT ? currency : outputCurrency

      if (newInputCurrency === newOutputCurrency) {
        return {
          ...state,
          inputCurrency: field === INPUT ? currency : '',
          outputCurrency: field === OUTPUT ? currency : ''
        }
      } else {
        return {
          ...state,
          inputCurrency: newInputCurrency,
          outputCurrency: newOutputCurrency
        }
      }
    }
    case 'UPDATE_INDEPENDENT': {
      const { field, value } = action.payload
      const { dependentValue, independentValue } = state

      return {
        ...state,
        independentValue: value,
        dependentValue: value === independentValue ? dependentValue : '',
        independentField: field
      }
    }
    case 'UPDATE_DEPENDENT': {
      return {
        ...state,
        dependentValue:  action.payload === null ? inputValue :  action.payload
      }
    }
    default: {
      return getInitialSwapState()
    }
  }
}

function getExchangeRate(inputValue, inputDecimals, outputValue, outputDecimals, invert = false) {
  try {
    if (
      inputValue &&
      (inputDecimals || inputDecimals === 0) &&
      outputValue &&
      (outputDecimals || outputDecimals === 0)
    ) {
      const factor = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))

      if (invert) {
        return inputValue
          .mul(factor)
          .div(outputValue)
          .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
      } else {
        return outputValue
          .mul(factor)
          .div(inputValue)
          .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
          .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
      }
    }
  } catch {}
}

function getMarketRate(
  swapType,
  inputReserveETH,
  inputReserveToken,
  inputDecimals,
  outputReserveETH,
  outputReserveToken,
  outputDecimals,
  invert = false
) {
  if (swapType === ETH_TO_TOKEN) {
    return getExchangeRate(outputReserveETH, 18, outputReserveToken, outputDecimals, invert)
  } else if (swapType === TOKEN_TO_ETH) {
    return getExchangeRate(inputReserveToken, inputDecimals, inputReserveETH, 18, invert)
  } else if (swapType === TOKEN_TO_TOKEN) {
    const factor = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))
    const firstRate = getExchangeRate(inputReserveToken, inputDecimals, inputReserveETH, 18)
    const secondRate = getExchangeRate(outputReserveETH, 18, outputReserveToken, outputDecimals)
    try {
      return !!(firstRate && secondRate) ? firstRate.mul(secondRate).div(factor) : undefined
    } catch {}
  }
}

async function fetchUserOrders(account, contract) {
  hasFetchedOrders = true
  const res = await fetch(`http://api.etherscan.io/api?module=account&action=txlist&address=${account}&startblock=8414292&sort=asc&apikey=`)
  const {message, result} = await res.json()
  if (message === 'OK') {
    // eslint-disable-next-line
    for (let { hash } of result) {
      const res = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${hash}&apikey=`)
      const { result } = await res.json()
      // @TODO: UAF - please change it, shame on you Nacho.
      if (result && result.input.indexOf('0xa9059cbb') !== -1 && result.input.length > UNISWAP_EX_TRANSFER_TX_LENGTH) {
        const order = await contract.decode(`0x${result.input.substr(UNISWAP_EX_TRANSFER_TX_LENGTH + 128, result.input.length)}`)
        orders.push(order)
      }
    }
  }
}

export default function ExchangePage({ initialCurrency, sending }) {
  const { t } = useTranslation()
  const { account} = useWeb3Context()
  const contract = useUniswapExContract()

  if (!hasFetchedOrders) {
    fetchUserOrders(account, contract)
  }
  const addTransaction = useTransactionAdder()

  const [rawSlippage] = useState(ALLOWED_SLIPPAGE_DEFAULT)
  const [rawTokenSlippage] = useState(TOKEN_ALLOWED_SLIPPAGE_DEFAULT)

  const allowedSlippageBig = ethers.utils.bigNumberify(rawSlippage)
  const tokenAllowedSlippageBig = ethers.utils.bigNumberify(rawTokenSlippage)

  // analytics
  useEffect(() => {
    ReactGA.pageview(window.location.pathname + window.location.search)
  }, [])

  // core swap state
  const [swapState, dispatchSwapState] = useReducer(swapStateReducer, initialCurrency, getInitialSwapState)

  const { independentValue, dependentValue, independentField, inputCurrency, outputCurrency } = swapState

  const [recipientError] = useState()

  // get swap type from the currency types
  const swapType = getSwapType(inputCurrency, outputCurrency)

  // get decimals and exchange address for each of the currency types
  const { symbol: inputSymbol, decimals: inputDecimals, exchangeAddress: inputExchangeAddress } = useTokenDetails(
    inputCurrency
  )
  const { symbol: outputSymbol, decimals: outputDecimals } = useTokenDetails(
    outputCurrency
  )

  // get input allowance
  const inputAllowance = useAddressAllowance(account, inputCurrency, inputExchangeAddress)

  // fetch reserves for each of the currency types
  const { reserveETH: inputReserveETH, reserveToken: inputReserveToken } = useExchangeReserves(inputCurrency)
  const { reserveETH: outputReserveETH, reserveToken: outputReserveToken } = useExchangeReserves(outputCurrency)

  // get balances for each of the currency types
  const inputBalance = useAddressBalance(account, inputCurrency)
  const outputBalance = useAddressBalance(account, outputCurrency)
  const inputBalanceFormatted = !!(inputBalance && Number.isInteger(inputDecimals))
    ? amountFormatter(inputBalance, inputDecimals, Math.min(4, inputDecimals))
    : ''
  const outputBalanceFormatted = !!(outputBalance && Number.isInteger(outputDecimals))
    ? amountFormatter(outputBalance, outputDecimals, Math.min(4, outputDecimals))
    : ''

  // compute useful transforms of the data above
  const independentDecimals = independentField === INPUT ? inputDecimals : outputDecimals
  const dependentDecimals = independentField === OUTPUT ? inputDecimals : outputDecimals

  // declare/get parsed and formatted versions of input/output values
  const [independentValueParsed, setIndependentValueParsed] = useState()
  const dependentValueFormatted = !!(dependentValue && (dependentDecimals || dependentDecimals === 0))
    ? amountFormatter(dependentValue, dependentDecimals, Math.min(4, dependentDecimals), false)
    : ''
  const inputValueParsed = independentField === INPUT ? independentValueParsed : dependentValue
  const inputValueFormatted = independentField === INPUT ? independentValue : dependentValueFormatted
  const outputValueParsed = independentField === OUTPUT ? independentValueParsed : dependentValue
  const outputValueFormatted = independentField === OUTPUT ? independentValue : dependentValueFormatted

  // validate + parse independent value
  const [independentError, setIndependentError] = useState()
  useEffect(() => {
    if (independentValue && (independentDecimals || independentDecimals === 0)) {
      try {
        const parsedValue = ethers.utils.parseUnits(independentValue, independentDecimals)

        if (parsedValue.lte(ethers.constants.Zero) || parsedValue.gte(ethers.constants.MaxUint256)) {
          throw Error()
        } else {
          setIndependentValueParsed(parsedValue)
          setIndependentError(null)
        }
      } catch {
        setIndependentError(t('inputNotValid'))
      }

      return () => {
        setIndependentValueParsed()
        setIndependentError()
      }
    }
  }, [independentValue, independentDecimals, t])

  // calculate slippage from target rate
  const { maximum: dependentValueMaximum } = calculateSlippageBounds(
    dependentValue,
    swapType === TOKEN_TO_TOKEN,
    tokenAllowedSlippageBig,
    allowedSlippageBig
  )

  // validate input allowance + balance
  const [inputError, setInputError] = useState()
  const [showUnlock, setShowUnlock] = useState(false)
  useEffect(() => {
    const inputValueCalculation = independentField === INPUT ? independentValueParsed : dependentValueMaximum
    if (inputBalance && (inputAllowance || inputCurrency === 'ETH') && inputValueCalculation) {
        // @TODO: revisit this maybe I can remove the two lines below
        setInputError(null)
        setShowUnlock(false)
      return () => {
        setInputError()
        setShowUnlock(false)
      }
    }
  }, [independentField, independentValueParsed, dependentValueMaximum, inputBalance, inputCurrency, inputAllowance, t])

  // calculate dependent value
  useEffect(() => {
    const amount = independentValueParsed

    if (independentField === OUTPUT) {
      return () => {  dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: null })}
    }
    if (swapType === ETH_TO_TOKEN) {
      const reserveETH = outputReserveETH
      const reserveToken = outputReserveToken

      if (amount && reserveETH && reserveToken) {
        try {
          const calculatedDependentValue =
            independentField === INPUT
              ? calculateEtherTokenOutputFromInput(amount, reserveETH, reserveToken)
              : calculateEtherTokenInputFromOutput(amount, reserveETH, reserveToken)

          if (calculatedDependentValue.lte(ethers.constants.Zero)) {
            throw Error()
          }

          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: calculatedDependentValue })
        } catch {
          setIndependentError(t('insufficientLiquidity'))
        }
        return () => {
          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: '' })
        }
      }
    } else if (swapType === TOKEN_TO_ETH) {
      const reserveETH = inputReserveETH
      const reserveToken = inputReserveToken

      if (amount && reserveETH && reserveToken) {
        try {
          const calculatedDependentValue =
            independentField === INPUT
              ? calculateEtherTokenOutputFromInput(amount, reserveToken, reserveETH)
              : calculateEtherTokenInputFromOutput(amount, reserveToken, reserveETH)

          if (calculatedDependentValue.lte(ethers.constants.Zero)) {
            throw Error()
          }

          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: calculatedDependentValue })
        } catch {
          setIndependentError(t('insufficientLiquidity'))
        }
        return () => {
          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: '' })
        }
      }
    } else if (swapType === TOKEN_TO_TOKEN) {
      const reserveETHFirst = inputReserveETH
      const reserveTokenFirst = inputReserveToken

      const reserveETHSecond = outputReserveETH
      const reserveTokenSecond = outputReserveToken

      if (amount && reserveETHFirst && reserveTokenFirst && reserveETHSecond && reserveTokenSecond) {
        try {
          if (independentField === INPUT) {
            const intermediateValue = calculateEtherTokenOutputFromInput(amount, reserveTokenFirst, reserveETHFirst)
            if (intermediateValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            const calculatedDependentValue = calculateEtherTokenOutputFromInput(
              intermediateValue,
              reserveETHSecond,
              reserveTokenSecond,
              false
            )
            if (calculatedDependentValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: calculatedDependentValue })
          } else {
            const intermediateValue = calculateEtherTokenInputFromOutput(amount, reserveETHSecond, reserveTokenSecond)
            if (intermediateValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            const calculatedDependentValue = calculateEtherTokenInputFromOutput(
              intermediateValue,
              reserveTokenFirst,
              reserveETHFirst
            )
            if (calculatedDependentValue.lte(ethers.constants.Zero)) {
              throw Error()
            }
            dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: calculatedDependentValue })
          }
        } catch {
          setIndependentError(t('insufficientLiquidity'))
        }
        return () => {
          dispatchSwapState({ type: 'UPDATE_DEPENDENT', payload: '' })
        }
      }
    }
  }, [
    independentValueParsed,
    swapType,
    outputReserveETH,
    outputReserveToken,
    inputReserveETH,
    inputReserveToken,
    independentField,
    t
  ])

  const [inverted, setInverted] = useState(false)
  const exchangeRate = getExchangeRate(inputValueParsed, inputDecimals, outputValueParsed, outputDecimals)
  const exchangeRateInverted = getExchangeRate(inputValueParsed, inputDecimals, outputValueParsed, outputDecimals, true)

  const marketRate = getMarketRate(
    swapType,
    inputReserveETH,
    inputReserveToken,
    inputDecimals,
    outputReserveETH,
    outputReserveToken,
    outputDecimals
  )

  const percentSlippage =
    exchangeRate && marketRate
      ? exchangeRate
          .sub(marketRate)
          .abs()
          .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
          .div(marketRate)
          .sub(ethers.utils.bigNumberify(3).mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(15))))
      : undefined

  const highSlippageWarning = percentSlippage && percentSlippage.gte(ethers.utils.parseEther('.2')) // [20+%

  const isValid = sending
    ? exchangeRate && inputError === null && independentError === null && recipientError === null
    : exchangeRate && inputError === null && independentError === null

  const estimatedText = `(${t('estimated')})`
  function formatBalance(value) {
    return `Balance: ${value}`
  }

  async function onSwap() {
    let method, fromCurrency, toCurrency, data, amount, minimumReturn

    ReactGA.event({
      category: 'place',
      action: 'place'
    })

    if (independentField === INPUT) {
      amount = independentValueParsed
      minimumReturn = dependentValue
    } else if (independentField === OUTPUT) {
      amount = dependentValue
      minimumReturn = independentValueParsed
    }

    if (swapType === ETH_TO_TOKEN) {
      method = contract.encode
      fromCurrency = ETHER_ADDRESS
      toCurrency = outputCurrency
    } else if (swapType === TOKEN_TO_ETH) {
      method = contract.encodeTokenOrder
      fromCurrency = inputCurrency
      toCurrency = ETHER_ADDRESS
    } else if (swapType === TOKEN_TO_TOKEN) {
      method = contract.encodeTokenOrder
      fromCurrency = inputCurrency
      toCurrency = outputCurrency
    }
    try {
      data = await method(fromCurrency, toCurrency, amount, minimumReturn, 100000000000000, account, ethers.utils.bigNumberify(ethers.utils.randomBytes(32)))
      const res = await (swapType === ETH_TO_TOKEN ? contract.depositETH(data, {value: amount}) : new Promise((res) => window.web3.eth.sendTransaction({
        from: account,
        to: fromCurrency,
        data
    }, (err, hash) => {
      res({ err, hash})
    })))

      if(res.hash) {
        addTransaction(res)
      }

    } catch(e) {
      console.log(e.message)
    }
  }

  async function onCancel(order) {
    //@TODO: missing salt
    const { _from, _to, _return, _fee, _owner} = order
    const tx = await contract.cancel( _from, _to, _return, _fee, _owner, ethers.utils.bigNumberify(ethers.utils.randomBytes(32)))
    addTransaction(tx)
  }

  const [customSlippageError] = useState('')

  const allBalances = useFetchAllBalances()

  return (
    <>
      <CurrencyInputPanel
        title={t('input')}
        allBalances={allBalances}
        description={inputValueFormatted && independentField === OUTPUT ? estimatedText : ''}
        extraText={inputBalanceFormatted && formatBalance(inputBalanceFormatted)}
        extraTextClickHander={() => {
          if (inputBalance && inputDecimals) {
            const valueToSet = inputCurrency === 'ETH' ? inputBalance.sub(ethers.utils.parseEther('.1')) : inputBalance
            if (valueToSet.gt(ethers.constants.Zero)) {
              dispatchSwapState({
                type: 'UPDATE_INDEPENDENT',
                payload: { value: amountFormatter(valueToSet, inputDecimals, inputDecimals, false), field: INPUT }
              })
            }
          }
        }}
        onCurrencySelected={inputCurrency => {
          dispatchSwapState({ type: 'SELECT_CURRENCY', payload: { currency: inputCurrency, field: INPUT } })
        }}
        onValueChange={inputValue => {
          dispatchSwapState({ type: 'UPDATE_INDEPENDENT', payload: { value: inputValue, field: INPUT } })
        }}
        showUnlock={showUnlock}
        selectedTokens={[inputCurrency, outputCurrency]}
        selectedTokenAddress={inputCurrency}
        value={inputValueFormatted}
        errorMessage={inputError ? inputError : independentField === INPUT ? independentError : ''}
      />
      <OversizedPanel>
        <DownArrowBackground>
          <DownArrow
            onClick={() => {
              dispatchSwapState({ type: 'FLIP_INDEPENDENT' })
            }}
            clickable
            alt="swap"
            active={isValid}
          />
        </DownArrowBackground>
      </OversizedPanel>
      <CurrencyInputPanel
        title={t('output')}
        allBalances={allBalances}
        description={outputValueFormatted && independentField === INPUT ? estimatedText : ''}
        extraText={outputBalanceFormatted && formatBalance(outputBalanceFormatted)}
        onCurrencySelected={outputCurrency => {
          dispatchSwapState({ type: 'SELECT_CURRENCY', payload: { currency: outputCurrency, field: OUTPUT } })
        }}
        onValueChange={outputValue => {
          dispatchSwapState({ type: 'UPDATE_INDEPENDENT', payload: { value: outputValue, field: OUTPUT } })
        }}
        selectedTokens={[inputCurrency, outputCurrency]}
        selectedTokenAddress={outputCurrency}
        value={outputValueFormatted}
        errorMessage={independentField === OUTPUT ? independentError : ''}
        disableUnlock
      />
      <OversizedPanel hideBottom>
        <ExchangeRateWrapper
          onClick={() => {
            setInverted(inverted => !inverted)
          }}
        >
          <ExchangeRate>{t('exchangeRate')}</ExchangeRate>
          {inverted ? (
            <span>
              {exchangeRate
                ? `1 ${inputSymbol} = ${amountFormatter(exchangeRate, 18, 4, false)} ${outputSymbol}`
                : ' - '}
            </span>
          ) : (
            <span>
              {exchangeRate
                ? `1 ${outputSymbol} = ${amountFormatter(exchangeRateInverted, 18, 4, false)} ${inputSymbol}`
                : ' - '}
            </span>
          )}
        </ExchangeRateWrapper>
      </OversizedPanel>
      <Flex>
        <Button
          disabled={!isValid || customSlippageError === 'invalid'}
          onClick={onSwap}
          warning={highSlippageWarning || customSlippageError === 'warning'}
        >
          {highSlippageWarning || customSlippageError === 'warning'
            ? t('swapAnyway')
            : t('place')}
        </Button>
      </Flex>
      <div>
          <h2>{t('Orders')}</h2>
          <div>
            {orders.map((order, index) => <div key={index} className="order">
              <p>{`fromToken: ${order._from}`}</p>
              <p>{`toToken: ${order._to}`}</p>
              {/* <p>{`amount: ${order._amou}`}</p> */}
              <p>{`return: ${ethers.utils.formatUnits(order._return, 18)}`}</p>
              <p>{`fee: ${ethers.utils.formatUnits(order._fee, 18)}`}</p>
              <Button onClick={() => onCancel(order)}>
              {t('cancel')}
            </Button>
            </div>)}
          </div>
      </div>
    </>
  )
}
