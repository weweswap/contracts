// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {LiquidityManager} from "./LiquidityManager.sol";
import {ILiquidityManagerFactory} from "./interfaces/ILiquidityManagerFactory.sol";

contract LiquidityManagerFactory is Ownable, ILiquidityManagerFactory {
    error LiquidityManagerAlreadyExists();
    error LiquidityManagerNoExists();

    struct Parameters {
        address factory;
        address nfpm;
        address pool;
        uint8 poolType;
    }

    /// @inheritdoc ILiquidityManagerFactory
    Parameters public override parameters;
    // poolType 0: Stable pool params: +/- 1% range: 5bps
    // poolType 1: Blue chip pool params: +/- 10% range: 30bps
    // poolType 2: Small cap pool params: +/- 50% range: 100bps
    // pool => liquidity manager
    mapping(address => address) public liquidityManagers;

    address public immutable nfpm; // Univ3 NonFungiblePositionManager

    constructor(address _nfpm) {
        nfpm = _nfpm;
    }

    function deployLiquidityManager(address pool, uint8 poolType) external onlyOwner {
        if (liquidityManagers[pool] != address(0)) {
            revert LiquidityManagerAlreadyExists();
        }

        parameters = Parameters({factory: address(this), nfpm: nfpm, pool: pool, poolType: poolType});
        address liquidityManager = address(new LiquidityManager{salt: keccak256(abi.encode(pool, poolType))}());
        liquidityManagers[pool] = liquidityManager;

        delete parameters;
    }

    function resetLiquidityManager(address pool) external onlyOwner {
        if (liquidityManagers[pool] == address(0)) {
            revert LiquidityManagerNoExists();
        }

        liquidityManagers[pool] = address(0);
    }
}
