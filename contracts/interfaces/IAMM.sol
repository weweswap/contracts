// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IAMM {
    function buy(uint256 amount, address token, bytes calldata extraData) external returns (uint256);
    function sell(uint256 amount, address token, bytes calldata extraData) external returns (uint256);
}
