//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract TestFactory {
  bytes32 constant SALT = bytes32(0);

  function create(bytes memory code) external returns (address) {
    address ct;
    bool failed;
    assembly /*("memory-safe")*/
    {
      ct := create(0, add(code, 32), mload(code))
      failed := iszero(extcodesize(ct))
    }
    require(!failed, "create failed");
    return ct;
  }

  function create2(bytes memory code) external returns (address) {
    bytes32 salt = SALT;
    address ct;
    bool failed;
    assembly /*("memory-safe")*/
    {
      ct := create2(0, add(code, 32), mload(code), salt)
      failed := iszero(extcodesize(ct))
    }
    require(!failed, "Contract already exists or constructor reverted");
    return ct;
  }
}
