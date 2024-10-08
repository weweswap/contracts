// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapv3} from "../../core/amm/IUniswapv3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract UniswapDynamicFee is IAMM, Ownable {
    address private router = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address private wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;

    constructor() Ownable() {}

    function buy(uint256 amount, address token, bytes calldata extraData) external returns (uint256) {
        // slice bytes
        bytes memory _fee = extraData[:6];

        uint24 fee = uint24(uint256(keccak256(_fee)));

        // max uint24 is 16777215 or 0xFFFFFF
        uint256 amountOut = _swap(wewe, token, amount, 0, fee);
        return amountOut;
    }

    function sell(uint256 amount, address token, bytes calldata extraData) external returns (uint256) {
        // slice bytes
        bytes memory _fee = extraData[:6];

        // max uint24 is 16777215 or 0xFFFFFF
        uint24 fee = uint24(uint256(keccak256(_fee)));
        uint256 amountOut = _swap(token, wewe, amount, 0, fee);
        return amountOut;
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 fee
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
