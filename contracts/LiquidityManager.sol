// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IUniswapV3Factory} from "./univ3-0.8/IUniswapV3Factory.sol";
import {ILiquidityManagerFactory} from "./interfaces/ILiquidityManagerFactory.sol";

contract LiquidityManager is IERC721Receiver {
    using SafeERC20 for IERC20;
    address public immutable factory; // LMFactory
    address public immutable ksZapRouter; // Zap router address
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

    error NarrowBandDepositFailed(bytes data);
    error MidBandDepositFailed(bytes data);
    error WideBandDepositFailed(bytes data);

    constructor() {
        (factory, ksZapRouter, nfpm, token, usdc, pool, poolType) = ILiquidityManagerFactory(msg.sender).lmParameters();
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

    function zapIn(
        uint256 amount,
        bytes calldata narrowBandData,
        bytes calldata midBandData,
        bytes calldata wideBandData
    ) external {
        // Approve token amount so that ksZapRouter can transfer tokens
        IERC20(token).approve(ksZapRouter, amount);

        (bool successNarrow, ) = ksZapRouter.call(narrowBandData);
        if (!successNarrow) {
            revert NarrowBandDepositFailed(narrowBandData);
        }

        (bool successMid, ) = ksZapRouter.call(midBandData);
        if (!successMid) {
            revert MidBandDepositFailed(midBandData);
        }

        (bool successWide, ) = ksZapRouter.call(wideBandData);
        if (!successWide) {
            revert WideBandDepositFailed(wideBandData);
        }
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        // Store band tokenIds
        if (narrowBandTokenId == 0) {
            narrowBandTokenId = tokenId;
        } else if (midBandTokenId == 0) {
            midBandTokenId = tokenId;
        } else if (wideBandTokenId == 0) {
            wideBandTokenId = tokenId;
        }
        // Return this value to confirm that the contract can receive ERC721 tokens
        return this.onERC721Received.selector;
    }
}
