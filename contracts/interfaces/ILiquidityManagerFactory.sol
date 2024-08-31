// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILiquidityManagerFactory {
    enum PoolType {
        Stable,
        BlueChip,
        SmallCap
    }

    struct PoolConfiguration {
        uint256 targetPriceDelta; // Stable: +/- 1%, BlueChip: +/- 10%, SmallCap: +/- 50%
        uint256 narrowRange; // 40%
        uint256 midRange; // 100%
        uint256 wideRange; // 170%
        uint24 fee; // Stable: 500, BlueChip: 3000, SmallCap: 10000
    }

    struct LiquidityManagerParameters {
        address factory;
        address ksZapRouter;
        address nfpm;
        address token;
        address usdc;
        address pool; // Univ3 Token-USDC pool
        PoolType poolType;
    }

    /// @notice Get the parameters to be used in constructing the liquidity manager, set transiently during liquidity manager creation.
    /// @dev Called by the liquidity manager constructor to fetch the parameters of the liquidity manager
    /// @dev This is used to avoid having constructor arguments in the liquidity manager contract, which results in the init code hash
    /// of the liquidity manager being constant allowing the CREATE2 address of the liquidity manager to be cheaply computed on-chain
    function lmParameters()
        external
        view
        returns (
            address factory,
            address ksZapRouter,
            address nfpm,
            address token,
            address usdc,
            address pool,
            PoolType poolType
        );

    function getPoolConfiguration(
        PoolType poolType
    )
        external
        view
        returns (
            uint256 targetPriceRange,
            uint256 narrowBandDelta,
            uint256 midBandDelta,
            uint256 wideBandDelta,
            uint24 fee
        );

    function rebalancers(address) external view returns (bool);
}
