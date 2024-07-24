// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface ILiquidityManagerFactory {
    /// @notice Get the parameters to be used in constructing the liquidity manager, set transiently during liquidity manager creation.
    /// @dev Called by the liquidity manager constructor to fetch the parameters of the liquidity manager
    /// @dev This is used to avoid having constructor arguments in the liquidity manager contract, which results in the init code hash
    /// of the liquidity manager being constant allowing the CREATE2 address of the liquidity manager to be cheaply computed on-chain
    function parameters() external view returns (address factory, address nfpm, address pool, uint8 poolType);
}
