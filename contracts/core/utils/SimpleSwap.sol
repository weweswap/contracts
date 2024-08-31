// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.19;
pragma abicoder v2;

import "hardhat/console.sol";

import { IV3SwapRouter } from "../../univ3-0.8/IV3SwapRouter.sol";
import { ISwapRouter02 } from "../../univ3-0.8/ISwapRouter02.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';

contract SimpleSwap {
    ISwapRouter02 public immutable swapRouter;
    address public constant WEWE = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;
    address public constant WETH9 = 0x4200000000000000000000000000000000000006;
    uint24 public constant feeTier = 10000;
    
    constructor(ISwapRouter02 _swapRouter) {
        swapRouter = _swapRouter;
    }
    
    function swapWETHForWEWE(uint amountIn) external returns (uint256 amountOut) {
        console.log(address(swapRouter));
        // Transfer the specified amount of WETH9 to this contract.
        TransferHelper.safeTransferFrom(WETH9, msg.sender, address(this), amountIn);
        console.log('Balance del contrato despues de transferir WETH:', IERC20(WETH9).balanceOf(address(this)));
        // Approve the router to spend WETH9.
        TransferHelper.safeApprove(WETH9, address(swapRouter), amountIn);
        console.log('safeApprove');
        // Create the params that will be used to execute the swap
        IV3SwapRouter.ExactInputSingleParams memory params =
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: WEWE,
                fee: feeTier,
                recipient: msg.sender,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut; 
    }

    function swapWEWEtoWETH(uint amountIn) external returns (uint256 amountOut) {
        console.log(address(swapRouter));
        // Transfer the specified amount of WEWE to this contract.
        TransferHelper.safeTransferFrom(WEWE, msg.sender, address(this), amountIn);
        console.log('Balance del contrato despues de transferir WETH:', IERC20(WEWE).balanceOf(address(this)));
        // Approve the router to spend WEWE.
        TransferHelper.safeApprove(WEWE, address(swapRouter), amountIn);
        console.log('safeApprove');
        // Create the params that will be used to execute the swap
        IV3SwapRouter.ExactInputSingleParams memory params =
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn: WEWE,
                tokenOut: WETH9,
                fee: feeTier,
                recipient: msg.sender,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut; 
    }
}