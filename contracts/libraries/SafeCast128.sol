// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

library SafeCast64 {
    uint256 private constant UINT128_MAX = 340_282_366_920_938_463_463_374_607_431_768_211_455;
    uint256 private constant INT128_MAX = 170_141_183_460_469_231_731_687_303_715_884_105_727;

    function toInt128(uint256 value) internal pure returns (int128 downcasted) {
        require(value <= INT128_MAX, "SafeCast128: value doesn't fit in 128 bits");
        downcasted = int128(uint128(value));
    }

    function toUInt128(uint256 value) internal pure returns (uint128 downcasted) {
        require(value <= UINT128_MAX, "SafeCast128: value doesn't fit in 128 bits");
        downcasted = uint128(value);
    }
}
