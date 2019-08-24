pragma solidity ^0.5.11;


import "../../contracts/libs/Fabric.sol";


contract VaultFactory {
    using Fabric for bytes32;

    function getVault(uint256 _number) public view returns (address) {
        return keccak256(_number).getVault();
    }

    function createVault(address _token, address _to) public view returns (address) {
        return keccak256(_number).createVault(_token, _to);
    }
}
