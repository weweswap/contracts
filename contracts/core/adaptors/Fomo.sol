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
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts);
}

contract Fomo is IAMM, Ownable {
    uint24 public fee = 10000;

    // Router https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant wrappedETH = 0x4200000000000000000000000000000000000006;
    address private constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant factory = 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6;
    address public constant v2router = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
    address public constant treasury = 0xe92E74661F0582d52FC0051aedD6fDF4d26A1F86;
    address public constant fomo = 0xd327d36EB6E1f250D191cD62497d08b4aaa843Ce;
    address internal constant v3router = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address internal constant wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;

    constructor() Ownable() {}

    function buy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        revert("Not implemented");
    }

    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        IERC20(token).approve(v2router, type(uint256).max);

        // We want to receive USDC for the token we send
        uint256 deadline = block.timestamp;
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = wrappedETH;

        // Use this to check slippage
        uint256[] memory amounts = IUniswapV2(v2router).getAmountsOut(amount, path);

        IUniswapV2(v2router).swapExactTokensForTokens(amount, 0, path, address(this), deadline);

        uint256 wethBalance = IERC20(wrappedETH).balanceOf(address(this));
        IERC20(wrappedETH).approve(v2router, type(uint256).max);

        path[0] = wrappedETH;
        path[1] = USDC;

        IUniswapV2(v2router).swapExactTokensForTokens(wethBalance, 0, path, address(this), deadline);

        uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
        uint256 amountOut = _v3swap(USDC, wewe, address(this), usdcBalance, 0);

        // Transfer the WETH to the treasury or recipient
        IERC20(wewe).transfer(treasury, amountOut);

        return amountOut;
    }

    function _v3swap(
        address tokenIn,
        address tokenOut,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) internal returns (uint256 amountOut) {
        
        IERC20(tokenIn).approve(v3router, type(uint256).max);
        ISwapRouter swapRouter = ISwapRouter(v3router);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 10000,
            recipient: recipient, // send back to the caller, this could be the merge contract
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        revert("Not implemented");
    }
}
