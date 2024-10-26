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

contract Fomo is IAMM, Ownable {
    struct PairData {
        address pair;
        bytes data; // Pair specific data such as bin step of TraderJoeV2, pool fee of Uniswap V3, etc.
    }

    // Router https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant wrappedETH = 0x4200000000000000000000000000000000000006;
    address private constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant factory = 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6;
    address public constant treasury = 0xe92E74661F0582d52FC0051aedD6fDF4d26A1F86;
    address public constant fomo = 0xd327d36EB6E1f250D191cD62497d08b4aaa843Ce;

    function getUSDCTokenPair(address token) external view returns (address) {
        return _getUSDCTokenPair(token);
    }

    function getWethTokenPair(address token) external view returns (address) {
        return _getWethTokenPair(token);
    }

    function _getUSDCTokenPair(address token) private view returns (address) {
        return IUniswapV2(factory).getPair(token, 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    }

    function _getWethTokenPair(address token) private view returns (address) {
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

        // We want to receive USDC for the token we send
        IUniswapV2(factory).swap(amount, 0, recipient, extraData);
        uint256 balance = IERC20(token).balanceOf(address(this));

        if (balance > 0) {
            // Make sure to transfer the remaining token to the treasury
            IERC20(token).transfer(treasury, balance);
        }

        return amount;
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
