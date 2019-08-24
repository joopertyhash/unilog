pragma solidity ^0.5.11;

import "./interfaces/IERC20.sol";
import "./interfaces/UniswapExchange.sol";
import "./interfaces/UniswapFactory.sol";
import "./libs/Fabric.sol";


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
