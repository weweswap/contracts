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
    address public immutable tokenToMigrate;
    address public immutable usdc;
    uint24 public immutable feeTier;

    /// @notice Constructor
    /// @param _nfpm NonfungiblePositionManager
    /// @param _swapRouter Uniswap SwapRouter02
    /// @param _tokenToMigrate Address of the token to be migrated to liquidity manager
    /// @param _usdc Address of the token USDC
    /// @param _feeTier Fee tier form uniswap router swap
    constructor(address _nfpm, address _swapRouter, address _tokenToMigrate, address _usdc, uint24 _feeTier) {
        require(_nfpm != address(0), "Migration: Invalid NonfungiblePositionManager address");
        require(_swapRouter != address(0), "Migration: Invalid SwapRouter address");
        swapRouter = ISwapRouter02(_swapRouter);
        nfpm = INonfungiblePositionManager(_nfpm);
        tokenToMigrate = _tokenToMigrate;
        usdc = _usdc;
        feeTier = _feeTier;
    }

    function _decreaseAllLiquidity(uint256 tokenId) private {
        (, , , , , , , uint128 liquidity, , , , ) = nfpm.positions(tokenId);
        require(liquidity > 0, "Migration: No liquidity in this LP");
        
        nfpm.decreaseLiquidity(
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

    function _decreaseAllLiquidityAndCollectFees(uint256 tokenId) private returns (uint256 collectedAmount0, uint256 collectedAmount1) {
        _decreaseAllLiquidity(tokenId);
        (collectedAmount0, collectedAmount1) = _collectAllFees(tokenId);
    }

    function _swap(address tokenIn, uint256 amountIn) private returns (uint256 amountOut) {
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        IV3SwapRouter.ExactInputSingleParams memory params =
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: usdc,
                fee: feeTier,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut; 
    }

    function _getPositionTokens(uint256 tokenId) internal view returns (address token0, address token1) {
        ( , , token0, token1, , , , , , , , ) = nfpm.positions(tokenId);
    }

    function _isValidNftPosition(address token0, address token1) internal view returns (bool) {
        return (token0 == tokenToMigrate || token1 == tokenToMigrate);
    }

    function _getTokenAndAmountToSwap(address token0, address token1, uint256 amountToken0, uint256 amountToken1) internal view returns (address, uint256) {
        if (token0 == tokenToMigrate) {
            return (token1, amountToken1);
        } else if (token1 == tokenToMigrate) {
            return (token0, amountToken0);
        } else {
            revert("No matching token found for migration");
        }
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        (address token0, address token1) = _getPositionTokens(tokenId);
        require(_isValidNftPosition(token0, token1), "Invalid NFT: Does not have the correct token");
        (uint256 amountToken0, uint256 amountToken1) = _decreaseAllLiquidityAndCollectFees(tokenId);
        (address tokenIn, uint256 amountIn) = _getTokenAndAmountToSwap(token0, token1, amountToken0, amountToken1);
        _swap(tokenIn, amountIn);
        return IERC721Receiver.onERC721Received.selector;
    }
}
