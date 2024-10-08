// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapv3} from "../../core/amm/IUniswapv3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Uniswapv3 is IAMM, Ownable {
    address private router = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address private wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;

    uint24 public fee;

    constructor() Ownable() {
        fee = 3000;
    }

    function setFee(uint24 _fee) external onlyOwner {
        if (_fee != 500 && _fee != 3000 && _fee != 10000) {
            revert("Uniswapv3: Invalid fee");
        }

        fee = _fee;
    }

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

        ERC20(tokenIn).approve(router, amountIn);

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
