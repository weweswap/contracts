// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {BaseUniRouter} from "./BaseUniRouter.sol";
import {IAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {ISwapRouter} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IUniswapV2 {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

contract UniswapV2 is IAMM, Ownable {
    // Router https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant wrappedETH = 0x4200000000000000000000000000000000000006;
    address private constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant factory = 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6;

    function getUSDCTokenPair(address token) external view returns (address) {
        return IUniswapV2(factory).getPair(token, 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    }

    function getWethTokenPair(address token) external view returns (address) {
        return IUniswapV2(factory).getPair(token, wrappedETH);
    }

    constructor() Ownable() {
    }

    function buy(uint256 amount, address token, address recipient, bytes calldata extraData) external returns (uint256) {
        revert("Not implemented");
    }

    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        address pair = IUniswapV2(factory).getPair(token, 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
        if (pair == address(0)) {
            return 0;
        }

        IERC20(token).approve(pair, type(uint256).max);
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        IUniswapV2(factory).swap(0, amount, recipient, extraData);
    }

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256){
        revert("Not implemented");
    }
}
