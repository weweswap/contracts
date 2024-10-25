// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {BaseUniRouter} from "./BaseUniRouter.sol";
import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {ISwapRouter} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3ViaRouter is BaseUniRouter, IAMM {
    constructor() {
        fee = 10000;
    }

    function buy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        // Buy the token (tokenOut) with wewe (tokenIn)
        uint256 amountOut = _buyWeWe(token, recipient, msg.sender, amount, 0);

        emit Bought(amount, amountOut, token, recipient);
        return amountOut;
    }

    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        // Sell the token (tokenIn) for wewe (tokenOut)
        uint256 amountOut = _sellWeWe(token, recipient, msg.sender, amount, 0);

        emit Sold(amount, amountOut, token, recipient);
        return amountOut;
    }

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = _sellWeWe(token, msg.sender, address(this), amount, 0);
        amountOut = _buyWeWe(token, recipient, address(this), amountOut, 0);

        return amountOut;
    }
}
