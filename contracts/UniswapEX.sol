pragma solidity ^0.5.11;


import "./commons/SafeMath.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/UniswapExchange.sol";
import "./interfaces/UniswapFactory.sol";
import "./libs/Fabric.sol";


contract UniswapEX {
    using SafeMath for uint256;
    using Fabric for bytes32;

    event DepositETH(
        uint256 _amount,
        bytes _data
    );

    event Executed(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _bought,
        uint256 _fee,
        address _owner,
        address _relayer
    );

    address public constant ETH_ADDRESS = address(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
    uint256 private constant never = uint(-1);

    UniswapFactory public uniswapFactory;

    mapping(bytes32 => uint256) public ethDeposits;

    constructor(UniswapFactory _uniswapFactory) public {
        uniswapFactory = _uniswapFactory;
    }

    function _ethToToken(
        UniswapFactory _uniswapFactory,
        IERC20 _token,
        uint256 _amount,
        address _dest
    ) private returns (uint256) {
        UniswapExchange uniswap = _uniswapFactory.getExchange(address(_token));

        if (_dest != address(this)) {
            return uniswap.ethToTokenTransferInput.value(_amount)(1, never, _dest);
        } else {
            return uniswap.ethToTokenSwapInput.value(_amount)(1, never);
        }
    }

    function _tokenToEth(
        UniswapFactory _uniswapFactory,
        IERC20 _token,
        uint256 _amount,
        address _dest
    ) private returns (uint256) {
        UniswapExchange uniswap = _uniswapFactory.getExchange(address(_token));

        // Check if previues allowance is enought
        // and approve Uniswap if is not
        uint256 prevAllowance = _token.allowance(address(this), address(uniswap));
        if (prevAllowance < _amount) {
            if (prevAllowance != 0) {
                _token.approve(address(uniswap), 0);
            }

            _token.approve(address(uniswap), uint(-1));
        }

        // Execute the trade
        if (_dest != address(this)) {
            return uniswap.tokenToEthTransferInput(_amount, 1, never, _dest);
        } else {
            return uniswap.tokenToEthSwapInput(_amount, 1, never);
        }
    }

    function _pull(
        IERC20 _from,
        bytes32 _key
    ) private returns (uint256 amount) {
        if (address(_from) == ETH_ADDRESS) {
            amount = ethDeposits[_key];
            ethDeposits[_key] = 0;
        } else {
            // TODO: pull tokens from Fabric lib
            revert("not implemented");
        }
    }

    function _keyOf(
        IERC20 _from,
        IERC20 _to,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                _from,
                _to,
                _return,
                _fee,
                _owner
            )
        );
    }

    function encode(
        address _from,
        address _to,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) external view returns (bytes memory) {
        return abi.encode(
            _from,
            _to,
            _return,
            _fee,
            _owner
        );
    }

    function decode(
        bytes calldata _data
    ) external view returns (
        address _from,
        address _to,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) {
        (
            _from,
            _to,
            _return,
            _fee,
            _owner
        ) = abi.decode(
            _data,
            (address, address, uint256, uint256, address)
        );
    }

    function exists(
        IERC20 _from,
        IERC20 _to,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) external view returns (bool) {
        bytes32 key = _keyOf(
            _from,
            _to,
            _return,
            _fee,
            _owner
        );

        if (address(_from) == ETH_ADDRESS) {
            return ethDeposits[key] != 0;
        } else {
            // TODO Check Fabric library
            revert("not implemented");
        }
    }

    function canFill(
        IERC20 _from,
        IERC20 _to,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) external view returns (bool) {
        bytes32 key = _keyOf(
            _from,
            _to,
            _return,
            _fee,
            _owner
        );

        // Pull amount
        uint256 amount;
        if (address(_from) == ETH_ADDRESS) {
            amount = ethDeposits[key];
        } else {
            // TODO Check Fabric library
            revert("not implemented");
        }

        uint256 bought;

        if (address(_from) == ETH_ADDRESS) {
            uint256 sell = amount.sub(_fee);
            bought = uniswapFactory.getExchange(address(_to)).getEthToTokenInputPrice(sell);
        } else if (address(_to) == ETH_ADDRESS) {
            bought = uniswapFactory.getExchange(address(_from)).getTokenToEthInputPrice(amount);
            bought = bought.sub(_fee);
        } else {
            uint256 boughtEth = uniswapFactory.getExchange(address(_from)).getTokenToEthInputPrice(amount);
            bought = uniswapFactory.getExchange(address(_to)).getEthToTokenInputPrice(boughtEth.sub(_fee));
        }

        return bought >= _return;
    }

    function depositETH(
        bytes calldata _data
    ) external payable {
        bytes32 key = keccak256(_data);
        ethDeposits[key] = ethDeposits[key].add(msg.value);
        emit DepositETH(msg.value, _data);
    }

    function cancel(
        IERC20 _from,
        IERC20 _to,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) external {
        require(msg.sender == _owner, "only owner can cancel");
        bytes32 key = _keyOf(
            _from,
            _to,
            _return,
            _fee,
            _owner
        );

        if (address(_from) == ETH_ADDRESS) {
            uint256 amount = ethDeposits[key];
            ethDeposits[key] = 0;
            msg.sender.transfer(amount);
        } else {
            // TODO Call transfer of Fabric library
            revert("Not implemented");
        }
    }

    function execute(
        IERC20 _from,
        IERC20 _to,
        uint256 _return,
        uint256 _fee,
        address payable _owner
    ) external {
        bytes32 key = _keyOf(
            _from,
            _to,
            _return,
            _fee,
            _owner
        );

        // Pull amount
        uint256 amount = _pull(_from, key);
        uint256 bought;

        if (address(_from) == ETH_ADDRESS) {
            // Keep some eth for paying the fee
            uint256 sell = amount.sub(_fee);
            bought = _ethToToken(uniswapFactory, _to, sell, _owner);
            msg.sender.transfer(_fee);
        } else if (address(_to) == ETH_ADDRESS) {
            // Convert
            bought = _tokenToEth(uniswapFactory, _from, amount, address(this));
            bought = bought.sub(_fee);

            // Send fee and amount bought
            msg.sender.transfer(_fee);
            _owner.transfer(bought);
        } else {
            // Convert from FromToken to ETH
            uint256 boughtEth = _tokenToEth(uniswapFactory, _to, amount, address(this));
            msg.sender.transfer(_fee);

            // Convert from ETH to ToToken
            bought = _ethToToken(uniswapFactory, _from, boughtEth.sub(_fee), _owner);
        }

        require(bought >= _return, "sell return is not enought");

        emit Executed(
            address(_from),
            address(_to),
            amount,
            bought,
            _fee,
            _owner,
            msg.sender
        );
    }

    function() external payable { }
}
