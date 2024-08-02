// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IWhitelist {
    function checkWhitelist(address from, address to, uint256 amount) external;
}
