
// File: contracts/interfaces/IERC20.sol

pragma solidity ^0.5.11;


/**
 * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see {ERC20Detailed}.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: contracts/interfaces/UniswapExchange.sol

pragma solidity ^0.5.11;


contract UniswapExchange {
    // Address of ERC20 token sold on this exchange
    function tokenAddress() external view returns (address token);
    // Address of Uniswap Factory
    function factoryAddress() external view returns (address factory);
    // Provide Liquidity
    function addLiquidity(uint256 min_liquidity, uint256 max_tokens, uint256 deadline) external payable returns (uint256);
    function removeLiquidity(uint256 amount, uint256 min_eth, uint256 min_tokens, uint256 deadline) external returns (uint256, uint256);
    // Get Prices
    function getEthToTokenInputPrice(uint256 eth_sold) external view returns (uint256 tokens_bought);
    function getEthToTokenOutputPrice(uint256 tokens_bought) external view returns (uint256 eth_sold);
    function getTokenToEthInputPrice(uint256 tokens_sold) external view returns (uint256 eth_bought);
    function getTokenToEthOutputPrice(uint256 eth_bought) external view returns (uint256 tokens_sold);
    // Trade ETH to ERC20
    function ethToTokenSwapInput(uint256 min_tokens, uint256 deadline) external payable returns (uint256  tokens_bought);
    function ethToTokenTransferInput(uint256 min_tokens, uint256 deadline, address recipient) external payable returns (uint256  tokens_bought);
    function ethToTokenSwapOutput(uint256 tokens_bought, uint256 deadline) external payable returns (uint256  eth_sold);
    function ethToTokenTransferOutput(uint256 tokens_bought, uint256 deadline, address recipient) external payable returns (uint256  eth_sold);
    // Trade ERC20 to ETH
    function tokenToEthSwapInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline) external returns (uint256  eth_bought);
    function tokenToEthTransferInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline, address recipient) external returns (uint256  eth_bought);
    function tokenToEthSwapOutput(uint256 eth_bought, uint256 max_tokens, uint256 deadline) external returns (uint256  tokens_sold);
    function tokenToEthTransferOutput(uint256 eth_bought, uint256 max_tokens, uint256 deadline, address recipient) external returns (uint256  tokens_sold);
    // Trade ERC20 to ERC20
    function tokenToTokenSwapInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address token_addr) external returns (uint256  tokens_bought);
    function tokenToTokenTransferInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address recipient, address token_addr) external returns (uint256  tokens_bought);
    function tokenToTokenSwapOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address token_addr) external returns (uint256  tokens_sold);
    function tokenToTokenTransferOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address recipient, address token_addr) external returns (uint256  tokens_sold);
    // Trade ERC20 to Custom Pool
    function tokenToExchangeSwapInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address exchange_addr) external returns (uint256  tokens_bought);
    function tokenToExchangeTransferInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address recipient, address exchange_addr) external returns (uint256  tokens_bought);
    function tokenToExchangeSwapOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address exchange_addr) external returns (uint256  tokens_sold);
    function tokenToExchangeTransferOutput(uint256 tokens_bought, uint256 max_tokens_sold, uint256 max_eth_sold, uint256 deadline, address recipient, address exchange_addr) external returns (uint256  tokens_sold);
    // ERC20 comaptibility for liquidity tokens
    bytes32 public name;
    bytes32 public symbol;
    uint256 public decimals;
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function balanceOf(address _owner) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    // Never use
    function setup(address token_addr) external;
}

// File: contracts/interfaces/UniswapFactory.sol

pragma solidity ^0.5.11;




contract UniswapFactory {
    // Public Variables
    address public exchangeTemplate;
    uint256 public tokenCount;
    // Create Exchange
    function createExchange(address token) external returns (address exchange);
    // Get Exchange and Token Info
    function getExchange(address token) external view returns (UniswapExchange exchange);
    function getToken(address exchange) external view returns (IERC20 token);
    function getTokenWithId(uint256 tokenId) external view returns (address token);
    // Never use
    function initializeFactory(address template) external;
}

// File: contracts/commons/Vault.sol

pragma solidity ^0.5.11;



contract Vault {
    constructor(IERC20 _token, address _to) payable public {
        _token.transfer(_to, _token.balanceOf(address(this)));
        // @TODO: maybe emit an event?
        selfdestruct(address(uint256(msg.sender))); //@TODO: revisit it
    }
}

// File: contracts/libs/Fabric.sol

pragma solidity ^0.5.11;



/**
 * @title Fabric
 * @dev Create deterministics vaults.
 */
library Fabric {
    /**
    * @dev Get a deterministics vault.
    */
    function getVault(bytes32 _key) internal view returns (address) {
        return address(
            uint256(
                keccak256(
                    abi.encodePacked(
                        byte(0xff),
                        address(this),
                        _key,
                        keccak256(type(Vault).creationCode)
                    )
                )
            )
        );
    }

    /**
    * @dev Create deterministic vault.
    */
    function createVault(bytes32 _key, address _token, address _to) internal {
        address addr;
        bytes memory slotcode = type(Vault).creationCode;

        /* solium-disable-next-line */
        assembly{
          let size := mload(slotcode)
          // Concatenate arguments for the constructor
          mstore(add(slotcode, add(size, 0x20)), _token)
          mstore(add(slotcode, add(size, 0x34)), _to)

          // Create the contract arguments for the constructor
          addr := create2(0, add(slotcode, 0x20), mload(slotcode), _key)
          if iszero(extcodesize(addr)) {
            revert(0, 0)
          }
        }
    }
}

// File: contracts/UniswapEX.sol

pragma solidity ^0.5.11;






contract UniswapEX {
    using Fabric for bytes32;

    address public constant ETH_ADDRESS = address(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
    uint256 private constant never = uint(-1);

    UniswapFactory public uniswapFactory;

    function create(
        IERC20 _from,
        IERC20 _to,
        uint256 _amount,
        uint256 _return,
        uint256 _fee
    ) external {

    }

    function execute(
        IERC20 _from,
        IERC20 _to,
        uint256 _amount,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) external {
        if (address(_from) == ETH_ADDRESS) {
            // Keep some eth for paying the fee
            uint256 sell = _amount - _fee;
            // Transfer fee
            msg.sender.transfer(_fee);
            // Convert using Uniswap
            UniswapExchange uniswap = uniswapFactory.getExchange(address(_to));
            uniswap.ethToTokenTransferInput.value(sell)(_return, never, _owner);
        } else if (address(_to) == ETH_ADDRESS) {
            // Add extra fee
            uint256 buy = _return + _fee;

            // Convert
            UniswapExchange uniswap = uniswapFactory.getExchange(address(_from));
            _from.approve(address(uniswap), never);
            uint256 bought = uniswap.tokenToEthSwapInput(_amount, buy, never);

            // Send fee and amount bought
            msg.sender.transfer(_fee);
            _owner.transfer(bought - _fee);
        } else {
            // Separate the two steps

            // Convert to ETH
            UniswapExchange uniswap = uniswapFactory.getExchange(address(_from));
            _from.approve(address(uniswap), uint(-1));
            uint256 bought = uniswap.tokenToEthSwapInput(_amount, 1, never);

            // Send fee and amount bought
            msg.sender.transfer(_fee);

            // Convert to final token
            UniswapExchange uniswapb = uniswapFactory.getExchange(address(_to));
            uniswapb.ethToTokenTransferInput.value(bought - _fee)(_return, never, _owner);
        }
    }

    function() external payable { }
}
