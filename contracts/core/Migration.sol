// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {INonfungiblePositionManager} from "../univ3-0.8/INonfungiblePositionManager.sol";
import { IV3SwapRouter } from "../univ3-0.8/IV3SwapRouter.sol";
import { ISwapRouter02 } from "../univ3-0.8/ISwapRouter02.sol";
import { TransferHelper } from "../univ3-0.8/TransferHelper.sol";

import "hardhat/console.sol";

contract Migration is IERC721Receiver {
    INonfungiblePositionManager public immutable nfpm;
    ISwapRouter02 public immutable swapRouter;
    address public immutable WEWE; 
    address public immutable WETH;
    address public immutable USDC;

    struct PositionTokens {
        address token0;
        address token1;
    }

    constructor(address _nfpm, address _swapRouter, address _WEWE, address _WETH, address _USDC) {
        require(_nfpm != address(0), "Migration: Invalid NonfungiblePositionManager address");
        require(_nfpm != address(0), "_swapRouter: Invalid SwapRouter address");
        swapRouter = ISwapRouter02(_swapRouter);
        nfpm = INonfungiblePositionManager(_nfpm);
        WEWE = _WEWE;
        WETH = _WETH;
        USDC = _USDC;
    }

    function _decreaseAllLiquidity(uint256 tokenId) private returns (uint256 amount0, uint256 amount1) {
        (, , , , , , , uint128 liquidity, , , , ) = nfpm.positions(tokenId);
        require(liquidity > 0, "Migration: No liquidity in this LP");
        
        (amount0, amount1) = nfpm.decreaseLiquidity(
                INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
    }

    function _collectAllFees(uint256 tokenId) private returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = nfpm.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    function _decreaseAllLiquidityAndCollectFees(uint256 tokenId) private returns (uint256 amount0, uint256 amount1) {
        _decreaseAllLiquidity(tokenId);
        (uint256 collectedAmount0, uint256 collectedAmount1) = _collectAllFees(tokenId);
        
        amount0 = collectedAmount0;
        amount1 = collectedAmount1;
    }

    function _swap(address tokenIn, uint256 amountIn) private returns (uint256 amountOut) {
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        IV3SwapRouter.ExactInputSingleParams memory params =
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: USDC,
                fee: 3000, // TODO: Parametrize
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut; 
    }

    function getPositionTokens(uint256 tokenId) internal view returns (PositionTokens memory) {
        ( , , address token0, address token1, , , , , , , , ) = nfpm.positions(tokenId);
        return PositionTokens(token0, token1);
    }

    function isWEWEWETHPool(uint256 tokenId) internal view returns (bool) {
        PositionTokens memory tokens = getPositionTokens(tokenId);
        return (tokens.token0 == WEWE && tokens.token1 == WETH) || (tokens.token0 == WETH && tokens.token1 == WEWE);
        // return false;
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        require(isWEWEWETHPool(tokenId), "Invalid NFT: Not a WEWE-WETH pool token");
        (uint256 amountToken0,) = _decreaseAllLiquidityAndCollectFees(tokenId);
        _swap(WETH, amountToken0);
        return IERC721Receiver.onERC721Received.selector;
    }
}
