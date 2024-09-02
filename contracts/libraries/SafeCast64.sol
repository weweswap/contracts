// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

library SafeCast64 {

    uint256 private constant UINT64_MAX = 18_446_744_073_709_551_615;
    uint256 private constant INT64_MAX = 9_223_372_036_854_775_807;

    function toInt64(uint256 value) internal pure returns (int64 downcasted) {
        require(value <= INT64_MAX, "SafeCast64: value doesn't fit in 64 bits");
        downcasted = int64(uint64(value));
    }

    function toUInt64(uint256 value) internal pure returns (uint64 downcasted) {
        require(value <= UINT64_MAX, "SafeCast64: value doesn't fit in 64 bits");
        downcasted = uint64(value);
    }
}