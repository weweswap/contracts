// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IUniswapV3Factory} from "../univ3-0.8/IUniswapV3Factory.sol";
import {LiquidityManager} from "./LiquidityManager.sol";
import {ILiquidityManagerFactory} from "../interfaces/ILiquidityManagerFactory.sol";
import {ILiquidityManager} from "../interfaces/ILiquidityManager.sol";

contract LiquidityManagerFactory is Ownable, ILiquidityManagerFactory {
    IUniswapV3Factory public immutable univ3Factory; // Univ3 Factory
    address public immutable ksZapRouter; // KS zap router address
    address public immutable nfpm; // Univ3 NonFungiblePositionManager
    address public immutable usdc; // USDC

    /// @inheritdoc ILiquidityManagerFactory
    LiquidityManagerParameters public override lmParameters;
    // poolType 0: Stable pool params: +/- 1% range: 5bps
    // poolType 1: Blue chip pool params: +/- 10% range: 30bps
    // poolType 2: Small cap pool params: +/- 50% range: 100bps
    // token => liquidity manager
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

    /// @inheritdoc ILiquidityManagerFactory
    mapping(address => bool) public rebalancers;

    event LiquidityManagerCreated(address indexed token, address liquidityManager);
    event LiquidityManagerReset(address indexed token);

    error NotAllowedToDeploy();
    error NotAllowedToRebalance();
    error LiquidityManagerAlreadyExists();
    error LiquidityManagerNoExists();
    error PoolNoExists();

    modifier onlyAllowedDeployer() {
        if (!allowAnyoneToRegister && msg.sender != owner()) {
            revert NotAllowedToDeploy();
        }
        _;
    }

    modifier onlyAllowedRebalancer() {
        if (!allowAnyRebalancer && !rebalancers[msg.sender]) {
            revert NotAllowedToRebalance();
        }
        _;
    }

    modifier onlyWhitelistedToken(address token) {
        if (getLiquidityManager[token] == address(0)) {
            revert LiquidityManagerNoExists();
        }
        _;
    }

    constructor(address _univ3Factory, address _ksZapRouter, address _nfpm, address _usdc) {
        univ3Factory = IUniswapV3Factory(_univ3Factory);
        ksZapRouter = _ksZapRouter;
        nfpm = _nfpm;
        usdc = _usdc;
    }

    function deployLiquidityManager(address token, PoolType poolType) external onlyAllowedDeployer {
        if (getLiquidityManager[token] != address(0)) {
            revert LiquidityManagerAlreadyExists();
        }

        // Check if token-USDC pair exists
        address pool = univ3Factory.getPool(token, usdc, getPoolConfiguration[poolType].fee);
        if (pool == address(0)) {
            revert PoolNoExists();
        }

        lmParameters = LiquidityManagerParameters({
            factory: address(this),
            ksZapRouter: ksZapRouter,
            nfpm: nfpm,
            token: token,
            usdc: usdc,
            pool: pool,
            poolType: poolType
        });
        address liquidityManager = address(new LiquidityManager{salt: keccak256(abi.encode(token, poolType))}());
        delete lmParameters;

        getLiquidityManager[token] = liquidityManager;

        // Check if univ3 pool is created or not
        emit LiquidityManagerCreated(token, liquidityManager);
    }

    function setPoolConfiguration(PoolType poolType, PoolConfiguration calldata poolConfiguration) external onlyOwner {
        getPoolConfiguration[poolType] = poolConfiguration;
    }

    function setRebalancer(address rebalancer, bool flag) external onlyOwner {
        rebalancers[rebalancer] = flag;
    }

    function pauseLiquidityManager(address token) external onlyOwner onlyWhitelistedToken(token) {
        ILiquidityManager(getLiquidityManager[token]).pause();
    }

    function unpauseLiquidityManager(address token) external onlyOwner onlyWhitelistedToken(token) {
        ILiquidityManager(getLiquidityManager[token]).unpause();
    }

    function renounceLiquidityManagerOwnership(address token) external onlyOwner onlyWhitelistedToken(token) {
        ILiquidityManager(getLiquidityManager[token]).renounceOwnership();
    }

    function setAllowAnyoneToRegister(bool _allowAnyoneToRegister) external onlyOwner {
        allowAnyoneToRegister = _allowAnyoneToRegister;
    }

    function resetLiquidityManager(address token) external onlyOwner onlyWhitelistedToken(token) {
        getLiquidityManager[token] = address(0);
        emit LiquidityManagerReset(token);
    }
}
