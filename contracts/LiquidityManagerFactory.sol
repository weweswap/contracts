// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {LiquidityManager} from "./LiquidityManager.sol";
import {ILiquidityManagerFactory} from "./interfaces/ILiquidityManagerFactory.sol";

contract LiquidityManagerFactory is Ownable, ILiquidityManagerFactory {
    address public immutable nfpm; // Univ3 NonFungiblePositionManager

    /// @inheritdoc ILiquidityManagerFactory
    LiquidityManagerParameters public override lmParameters;
    // poolType 0: Stable pool params: +/- 1% range: 5bps
    // poolType 1: Blue chip pool params: +/- 10% range: 30bps
    // poolType 2: Small cap pool params: +/- 50% range: 100bps
    // pool => liquidity manager
    mapping(address => address) public getLiquidityManager;

    // Band and Fee params
    /// @inheritdoc ILiquidityManagerFactory
    mapping(PoolType => PoolConfiguration) public override getPoolConfiguration;

    // Owner configuration
    bool public allowAnyoneToRegister; // Determine who can deploy liquidity managers
    bool public allowAnyRebalancer; // Determine if anyone can call rebalance
    uint24 public yieldCollectFees = 500; // 5 bps
    uint24 public rebalancerFees = 500; // 5 bps
    uint256 public yieldCollectInterval = 86400; // Default: Collect fee once a day
    uint256 public secondsOutsideRangeBeforeRebalance; // To-do: Do we need this one?

    event LiquidityManagerCreated(address indexed pool, address liquidityManager);
    event LiquidityManagerReset(address indexed pool);

    error NotAllowedToDeploy();
    error LiquidityManagerAlreadyExists();
    error LiquidityManagerNoExists();

    modifier onlyAllowedDeployer() {
        if (!allowAnyoneToRegister && msg.sender != owner()) {
            revert NotAllowedToDeploy();
        }
        _;
    }
    constructor(address _nfpm) {
        nfpm = _nfpm;
    }

    function deployLiquidityManager(address pool, PoolType poolType) external onlyAllowedDeployer {
        if (getLiquidityManager[pool] != address(0)) {
            revert LiquidityManagerAlreadyExists();
        }

        lmParameters = LiquidityManagerParameters({factory: address(this), nfpm: nfpm, pool: pool, poolType: poolType});
        address liquidityManager = address(new LiquidityManager{salt: keccak256(abi.encode(pool, poolType))}());
        delete lmParameters;

        getLiquidityManager[pool] = liquidityManager;
        emit LiquidityManagerCreated(pool, liquidityManager);
    }

    function setAllowAnyoneToRegister(bool _allowAnyoneToRegister) external onlyOwner {
        allowAnyoneToRegister = _allowAnyoneToRegister;
    }

    function resetLiquidityManager(address pool) external onlyOwner {
        if (getLiquidityManager[pool] == address(0)) {
            revert LiquidityManagerNoExists();
        }

        getLiquidityManager[pool] = address(0);
        emit LiquidityManagerReset(pool);
    }
}
