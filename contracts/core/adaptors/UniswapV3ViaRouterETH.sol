// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {BaseUniRouter} from "./BaseUniRouter.sol";
import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {ISwapRouter} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UniswapV3ViaRouterETH is BaseUniRouter, IAMM {
    // Router https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant wrappedETH = 0x4200000000000000000000000000000000000006;
    address private intermidiateToken;

    constructor() Ownable() {
        fee = 10000;
        intermidiateToken = wrappedETH;

        // Approve the router to spend TOKEN.
        TransferHelper.safeApprove(wrappedETH, router, type(uint256).max);
    }

    function setIntermidiateToken(address _intermidiateToken) external onlyOwner {
        require(_intermidiateToken != wrappedETH, "UniswapV3ViaRouterETH: Invalid intermidiate token");
        intermidiateToken = _intermidiateToken;

        // Approve the router to spend TOKEN.
        TransferHelper.safeApprove(intermidiateToken, router, type(uint256).max);
    }

    function buy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = _swap(intermidiateToken, token, recipient, msg.sender, amount, 0);

        emit Bought(amount, amountOut, token, recipient);
        return amountOut;
    }

    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = _swap(token, intermidiateToken, recipient, msg.sender, amount, 0);

        emit Sold(amount, amountOut, token, recipient);
        return amountOut;
    }

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = _swap(token, intermidiateToken, address(this), msg.sender, amount, 0);
        amountOut = _swap(intermidiateToken, token, recipient, address(this), amountOut, 0);

        emit Sold(amount, amountOut, token, recipient);
        return amountOut;
    }
}
