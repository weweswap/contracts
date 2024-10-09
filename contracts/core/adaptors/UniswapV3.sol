// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UniswapV3 is IAMM, Ownable {
    // Factory https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant factory = 0x33128a8fC17869897dcE68Ed026d694621f6FDfD;
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
        address pool = IUniswapV3(factory).getPool(tokenIn, tokenOut, fee);
        require(pool != address(0), "Uniswapv3: Pool not found");

        // address pool = 0x6F71796114B9CDaef29A801BC5cdBCb561990Eeb;

        ERC20(tokenIn).approve(pool, amountIn);

        address recipient = address(this);
        int256 amountSpecified = int256(amountIn);

        // if zeroForOne is false, the price cannot be greater than this value after the swap
        // uint160 sqrtPriceLimitX96 = uint160(amountOutMinimum);
        uint160 sqrtPriceLimitX96 = type(uint160).max;

        // True is zeroForOne, set to true for token0 to token1
        (, int256 amount1) = IUniswapV3Pool(pool).swap(recipient, false, amountSpecified, sqrtPriceLimitX96, extraData);

        if (amount1 < 0) {
            revert("Uniswapv3: Insufficient output amount");
        }

        // Return the delta of of tokenOut
        amountOut = uint256(amount1);
    }
}
