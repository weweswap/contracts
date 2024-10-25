// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

struct Vesting {
    uint256 amount;
    uint256 end;
}

interface IMergeV2 {
    function deposit(uint256 amount) external;
    function getRate() external view returns (uint256);
    function setRate(uint256 rate) external;
    function getToken() external view returns (address);
    function merge(uint256 amount) external;
}
