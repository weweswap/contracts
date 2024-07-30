// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface ILiquidityManager {
    enum BandType {
        Narrow,
        Mid,
        Wide
    }

    struct ZapUniswapV3Results {
        uint256 tokenId;
        uint128 liquidity;
        uint256 remainAmount0;
        uint256 remainAmount1;
    }
}
