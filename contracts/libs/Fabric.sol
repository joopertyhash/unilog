pragma solidity ^0.5.11;

import "../interfaces/IERC20.sol";
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
    function executeVault(bytes32 _key, IERC20 _token, address _to) internal returns (uint256 value) {
        address addr;
        bytes memory slotcode = type(Vault).creationCode;

        /* solium-disable-next-line */
        assembly{
          // Create the contract arguments for the constructor
          addr := create2(0, add(slotcode, 0x20), mload(slotcode), _key)
          if iszero(extcodesize(addr)) {
            revert(0, 0)
          }
        }

        value = _token.balanceOf(addr);
        Vault(addr).execute(_token, _to, value);
    }
}