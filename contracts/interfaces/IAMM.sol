// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IAMM {
    function swap(uint256 amount, address token, bytes calldata extraData) external returns (uint256);
}
