// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IUniswapV2 {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}
