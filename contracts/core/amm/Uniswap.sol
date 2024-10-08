// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IAMM} from "../../interfaces/IAMM.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

interface IUniswapv3 {
    // function swapExactTokensForTokens(
    //     uint amountIn,
    //     uint amountOutMin,
    //     address[] calldata path,
    //     address to,
    //     uint deadline
    // ) external returns (uint[] memory amounts);
    // function swapTokensForExactTokens(
    //     uint amountOut,
    //     uint amountInMax,
    //     address[] calldata path,
    //     address to,
    //     uint deadline
    // ) external returns (uint[] memory amounts);
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract Uniswapv3 is IAMM {
    address private router = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address private wewe = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    uint24 public fee = 3000;

    constructor() {}

    function buy(uint256 amount, address token, bytes calldata extraData) external returns (uint256) {
        uint256 amountOut = _swap(wewe, token, amount, 0);
        return amountOut;
    }

    function sell(uint256 amount, address token, bytes calldata extraData) external returns (uint256) {
        uint256 amountOut = _swap(token, wewe, amount, 0);
        return amountOut;
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) private returns (uint256 amountOut) {
        address pool = IUniswapv3(router).getPool(tokenIn, tokenOut, fee);
        require(pool != address(0), "Uniswapv3: Pool not found");

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this), // msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = ISwapRouter(router).exactInputSingle(params);
    }
}
