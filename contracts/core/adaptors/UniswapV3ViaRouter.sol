// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UniswapV3ViaRouter is IAMM, Ownable {
    // Router https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant router = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address private constant wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;

    uint24 public fee;

    // enum FeeAmount {
    //     LOWEST,
    //     LOW,
    //     MEDIUM,
    //     HIGH
    // }

    constructor() Ownable() {
        fee = 10000;
    }

    function setFee(uint24 _fee) external onlyOwner {
        // Only allow these https://docs.uniswap.org/sdk/v3/reference/enums/FeeAmount

        if (_fee != 100 && _fee != 500 && _fee != 3000 && _fee != 10000) {
            revert("Uniswapv3: Invalid fee");
        }

        fee = _fee;
    }

    function swap(uint256 amount, address token, bytes calldata extraData) external returns (uint256) {
        uint256 amountOut = _swap(token, wewe, amount, 0, extraData);
        return amountOut;
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        bytes calldata extraData
    ) private returns (uint256 amountOut) {
        ISwapRouter swapRouter = ISwapRouter(0x2626664c2603336E57B271c5C0b26F421741e481);

        // Transfer the specified amount of TOKEN to this contract.
        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);

        // Approve the router to spend TOKEN.
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: wewe,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }
}
