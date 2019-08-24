pragma solidity ^0.5.11;

import "../interfaces/IERC20.sol";


contract Vault {
    function execute(IERC20 _token, address _to, uint256 _val) external payable {
        _token.transfer(_to, _val);
        // @TODO: maybe emit an event?
        selfdestruct(address(uint256(msg.sender))); //@TODO: revisit it
    }
}