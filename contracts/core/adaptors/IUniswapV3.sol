// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IUniswapV3 {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}
