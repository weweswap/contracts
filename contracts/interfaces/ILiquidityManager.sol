// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILiquidityManager {
    enum BandType {
        Narrow,
        Mid,
        Wide
    }

    struct ZapInParams {
        bool zappingIn;
        BandType bandType;
        uint256 tokenId;
    }

    struct ZapUniswapV3Results {
        uint256 tokenId;
        uint128 liquidity;
        uint256 remainAmount0;
        uint256 remainAmount1;
    }

    function pause() external;
    function unpause() external;
    function renounceOwnership() external;
}
