pragma solidity ^0.5.11;

import "../interfaces/IERC20.sol";


/**
 * @title Fabric
 * @dev Create deterministics vaults.
 */
library Fabric {
    /*Vault bytecode

        def _fallback() payable:
            call cd[56] with:
                funct call.data[0 len 4]
                gas cd[56] wei
                args call.data[4 len 64]
            selfdestruct(tx.origin)

        // Constructor bytecode
        0x6012600081600a8239f3

        0x60 12 - PUSH1 18           // Size of the contract to return
        0x60 00 - PUSH1 00           // Memory offset to return stored code
        0x81    - DUP2  18           // Size of code to copy
        0x60 0a - PUSH1 10           // Start of the code to copy
        0x82    - DUP3  00           // Dest memory for code copy
        0x39    - CODECOPY 00 10 18  // Code copy to memory
        0xf3    - RETURN 00 18       // Return code to store

        // Deployed contract bytecode
        0x600080604480828037818060383580F132ff

        0x60 00 - PUSH1 00                    // Size for the call output
        0x80    - DUP1  00                    // Offset for the call output
        0x60 44 - PUSH1 68                    // Size for the call input
        0x80    - DUP1  68                    // Size for copying calldata to memory
        0x82    - DUP3  00                    // Offset for calldata copy
        0x80    - DUP1  00                    // Offset for destination of calldata copy
        0x37    - CALLDATACOPY 00 00 68       // Execute calldata copy, is going to be used for next call
        0x81    - DUP2  00                    // Offset for call input
        0x80    - DUP1  00                    // Amount of ETH to send during call
        0x60 38 - PUSH1 56                    // calldata pointer to load value into stack
        0x35    - CALLDATALOAD 56 (A)         // Load value (A), address to call
        0x80    - DUP1 (A)                    // Duplicate value A, use it as relay gas (all gas)
        0xf1    - CALL (A) (A) 00 00 68 00 00 // Execute call to address (A) with calldata mem[0:64]
        0x32    - ORIGIN (B)                  // Dest funds for selfdestruct
        0xff    - SELFDESTRUCT (B)            // selfdestruct contract, end of execution
    */
    bytes public constant code = hex"6012600081600a8239f3600080604480828037818060383580F132ff";
    bytes32 public constant vaultCodeHash = bytes32(0x2181585254e7c07724b5632e568c21a1c60af90844b5c7a06b5438a1d78915ce);

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
                        vaultCodeHash
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
        bytes memory slotcode = code;

        /* solium-disable-next-line */
        assembly{
          // Create the contract arguments for the constructor
          addr := create2(0, add(slotcode, 0x20), mload(slotcode), _key)
          if iszero(extcodesize(addr)) {
            revert(0, 0)
          }
        }

        value = _token.balanceOf(addr);
        (bool success, ) = addr.call(
            abi.encodePacked(
                abi.encodeWithSelector(
                    _token.transfer.selector,
                    _to,
                    value
                ),
                address(_token)
            )
        );

        require(success, "error pulling tokens");
    }
}