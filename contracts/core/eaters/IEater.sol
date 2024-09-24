// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IEater {
    function eatAll() external;
    function eat(uint256 amount) external;
    function getRate() external view returns (uint256);
    function setRate(uint256 rate) external;
}
