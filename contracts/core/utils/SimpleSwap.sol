// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.19;
pragma abicoder v2;

import {IV3SwapRouter} from "../../univ3-0.8/IV3SwapRouter.sol";
import {ISwapRouter02} from "../../univ3-0.8/ISwapRouter02.sol";
import {TransferHelper} from "../../univ3-0.8/TransferHelper.sol";

contract SimpleSwap {
    ISwapRouter02 public immutable swapRouter;
    address public immutable WEWE;
    address public immutable WETH9;
    uint24 public constant feeTier = 10000;

    constructor(address _token, ISwapRouter02 _swapRouter) {
        swapRouter = _swapRouter;
        WETH9 = 0x4200000000000000000000000000000000000006;
        WEWE = _token;
    }

    function swapWETHForWEWE(uint amountIn, address recipient) external returns (uint256 amountOut) {
        // Transfer the specified amount of WETH9 to this contract.
        TransferHelper.safeTransferFrom(WETH9, msg.sender, address(this), amountIn);
        // Approve the router to spend WETH9.
        TransferHelper.safeApprove(WETH9, address(swapRouter), amountIn);
        // Create the params that will be used to execute the swap
        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
            tokenIn: WETH9,
            tokenOut: WEWE,
            fee: feeTier,
            recipient: recipient,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }
}
