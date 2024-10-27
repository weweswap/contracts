// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IBuyAMM {
    function buy(uint256 amount, address recipient) external returns (uint256);
    event Bought(uint256 amount, uint256 amountOut, address token, address indexed recipient);
}

interface ISellAMM {
    function sell(uint256 amount, address recipient) external returns (uint256);
    event Sold(uint256 amount, uint256 amountOut, address token, address indexed recipient);
}

interface IAMM {
    function buy(uint256 amount, address token, address recipient, bytes calldata extraData) external returns (uint256);
    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256);

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256);

    event Bought(uint256 amount, uint256 amountOut, address token, address indexed recipient);
    event Sold(uint256 amount, uint256 amountOut, address token, address indexed recipient);
}
