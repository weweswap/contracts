// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {ISwapRouter} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3ViaRouter is IAMM, Ownable {
    // Router https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant router = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address private constant wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;

    uint24 public fee;

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

    function swap(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = _swap(token, recipient, msg.sender, amount, 0);

        emit Swapped(amount, amountOut, token, recipient);
        return amountOut;
    }

    function _swap(
        address tokenIn,
        address from,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) private returns (uint256 amountOut) {
        ISwapRouter swapRouter = ISwapRouter(router);

        // Transfer the specified amount of TOKEN to this contract.
        TransferHelper.safeTransferFrom(tokenIn, from, address(this), amountIn);

        // Approve the router to spend TOKEN.
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: wewe,
            fee: fee,
            recipient: recipient, // send back to the caller, this could be the merge contract
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }
}
