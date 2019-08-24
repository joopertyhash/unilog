pragma solidity ^0.5.11;


import "./commons/SafeMath.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/UniswapExchange.sol";
import "./interfaces/UniswapFactory.sol";


contract UniswapEX {
    using SafeMath for uint256;

    address public constant ETH_ADDRESS = address(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
    uint256 private constant never = uint(-1);

    UniswapFactory public uniswapFactory;

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
        UniswapExchange uniswap = uniswapFactory.getExchange(address(_token));

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
            uniswap.tokenToEthTransferInput(_amount, 1, never, _dest);
        } else {
            uniswap.tokenToEthSwapInput(_amount, 1, never);
        }
    }

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
            uint256 sell = _amount.sub(_fee);
            uint256 bought = _ethToToken(uniswapFactory, _from, sell, _owner);
            require(bought >= _return, "sell return is not enought");
            _owner.transfer(_fee);
        } else if (address(_to) == ETH_ADDRESS) {
            // Convert
            uint256 bought = _tokenToEth(uniswapFactory, _to, _amount, address(this));
            require(bought >= _return.add(_fee), "sell return is not enought");

            // Send fee and amount bought
            msg.sender.transfer(_fee);
            _owner.transfer(bought.sub(_fee));
        } else {
            // Convert from FromToken to ETH
            uint256 boughtEth = _tokenToEth(uniswapFactory, _from, _amount, address(this));
            msg.sender.transfer(_fee);

            // Convert from ETH to ToToken
            uint256 boughtToken = _ethToToken(uniswapFactory, _to, boughtEth.sub(_fee), _owner);
            require(boughtToken >= _return, "sell return is not enought");
        }
    }

    function() external payable { }
}
