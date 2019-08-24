pragma solidity ^0.5.11;

import "../commons/Vault.sol";


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