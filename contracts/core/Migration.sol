// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {INonfungiblePositionManager} from "../univ3-0.8/INonfungiblePositionManager.sol";

import "hardhat/console.sol";

contract Migration is IERC721Receiver {
    INonfungiblePositionManager public immutable nfpm; // Univ3 NFPM

    constructor() {
        address _nfpm;

        nfpm = INonfungiblePositionManager(_nfpm); // TODO: Invstigar como rellenar esta variable
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
        (uint256 amountToken0, uint256 amountToken1) = _decreaseAllLiquidity(tokenId);
        (uint256 collectedAmount0, uint256 collectedAmount1) = _collectAllFees(tokenId);
        
        amount0 = amountToken0 + collectedAmount0;
        amount1 = amountToken1 + collectedAmount1;
    }

    function _swap() private {
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        console.log('Received tokenId', tokenId);
        // 1. Receive NFT possition
        // 2. (uint256 amountToken0, uint256 amountToken1) = _decreaseAllLiquidityAndCollectFees(tokenId)
        // 3. Call swap (All WETH to USDC)
        // 4. Call deposit of Liquidity Manager
        // 5. Get ERC20 token
        // 6. Send to user
    }
}
