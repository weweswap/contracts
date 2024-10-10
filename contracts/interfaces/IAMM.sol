// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IAMM {
    function swap(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256);

    event Swapped(uint256 amount, uint256 amountOut, address token, address indexed recipient);
}
