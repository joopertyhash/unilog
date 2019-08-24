pragma solidity ^0.5.11;

import "../interfaces/IERC20.sol";


contract Vault {
    function execute(IERC20 _token, address _to) external payable {
        _token.transfer(_to, _token.balanceOf(address(this)));
        // @TODO: maybe emit an event?
        selfdestruct(address(uint256(msg.sender))); //@TODO: revisit it
    }
}