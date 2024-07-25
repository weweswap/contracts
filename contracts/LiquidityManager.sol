// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IUniswapV3Factory} from "./univ3-0.8/IUniswapV3Factory.sol";
import {ILiquidityManagerFactory} from "./interfaces/ILiquidityManagerFactory.sol";

contract LiquidityManager is IERC721Receiver {
    address public immutable factory; // LMFactory
    address public immutable nfpm; // Univ3 NFPM
    address public immutable token; // Token address
    address public immutable usdc; // Token address
    address public immutable pool; // Token-USDC pool
    ILiquidityManagerFactory.PoolType public immutable poolType;

    ILiquidityManagerFactory.PoolConfiguration public poolConfiguration;
    bool public unlocked;
    uint256 public totalLiquidity; // Total liquidity deposited
    uint256 public narrowBandTokenId;
    uint256 public midBandTokenId;
    uint256 public wideBandTokenId;

    constructor() {
        (factory, nfpm, token, usdc, poolType) = ILiquidityManagerFactory(msg.sender).lmParameters();
        (
            uint256 targetPriceRange,
            uint256 narrowBandDelta,
            uint256 midBandDelta,
            uint256 wideBandDelta,
            uint24 fee
        ) = ILiquidityManagerFactory(msg.sender).getPoolConfiguration(poolType);

        poolConfiguration = ILiquidityManagerFactory.PoolConfiguration(
            targetPriceRange,
            narrowBandDelta,
            midBandDelta,
            wideBandDelta,
            fee
        );
    }

    function deposit() external {}

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        // Return this value to confirm that the contract can receive ERC721 tokens
        return this.onERC721Received.selector;
    }
}
