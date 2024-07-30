// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IUniswapV3Factory} from "./univ3-0.8/IUniswapV3Factory.sol";
import {INonfungiblePositionManager} from "./univ3-0.8/INonfungiblePositionManager.sol";
import {ILiquidityManager} from "./interfaces/ILiquidityManager.sol";
import {ILiquidityManagerFactory} from "./interfaces/ILiquidityManagerFactory.sol";

contract LiquidityManager is ILiquidityManager, IERC721Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable factory; // LMFactory
    address public immutable ksZapRouter; // Zap router address
    INonfungiblePositionManager public immutable nfpm; // Univ3 NFPM
    IERC20 public immutable token; // Token address
    IERC20 public immutable usdc; // Token address
    address public immutable pool; // Token-USDC pool
    ILiquidityManagerFactory.PoolType public immutable poolType;

    ILiquidityManagerFactory.PoolConfiguration public poolConfiguration;
    bool public unlocked;
    mapping(BandType => uint256) public totalLiquidity; // Total liquidity deposited
    mapping(BandType => uint256) public bandTokenId; // Band tokenIds
    mapping(address => mapping(BandType => uint256)) public liquidities; // Deposited liquidity

    error ZeroAmount();
    error BandDepositFailed(bytes data);
    error ZapInFailed();
    error InvalidNFT();

    constructor() {
        address tokenAddress;
        address usdcAddress;
        address nfpmAddress;

        (factory, ksZapRouter, nfpmAddress, tokenAddress, usdcAddress, pool, poolType) = ILiquidityManagerFactory(
            msg.sender
        ).lmParameters();
        (
            uint256 targetPriceRange,
            uint256 narrowBandDelta,
            uint256 midBandDelta,
            uint256 wideBandDelta,
            uint24 fee
        ) = ILiquidityManagerFactory(msg.sender).getPoolConfiguration(poolType);
        token = IERC20(tokenAddress);
        usdc = IERC20(usdcAddress);
        nfpm = INonfungiblePositionManager(nfpmAddress);

        poolConfiguration = ILiquidityManagerFactory.PoolConfiguration(
            targetPriceRange,
            narrowBandDelta,
            midBandDelta,
            wideBandDelta,
            fee
        );
    }

    function zapIn(uint256 amount, BandType bandType, bytes calldata bandData) external nonReentrant {
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.safeApprove(ksZapRouter, amount);

        ZapUniswapV3Results memory zapResult = _ksZapIn(bandData);

        // Transfer leftovers
        if (token < usdc) {
            token.safeTransfer(msg.sender, zapResult.remainAmount0);
            usdc.safeTransfer(msg.sender, zapResult.remainAmount1);
        } else {
            token.safeTransfer(msg.sender, zapResult.remainAmount1);
            usdc.safeTransfer(msg.sender, zapResult.remainAmount0);
        }

        totalLiquidity += zapResult.liquidity;
        liquidities[msg.sender] += zapResult.liquidity;
    }

    function _ksZapIn(bytes calldata data) private returns (ZapUniswapV3Results memory zapResult) {
        (bool success, bytes memory zapResultData) = ksZapRouter.call(data);
        if (!success) {
            revert BandDepositFailed(data);
        }

        zapResult = abi.decode(zapResultData, (ZapUniswapV3Results));
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        if (unlocked) {
            // Already 3 NFT bands created
            revert InvalidNFT();
        }

        // // Store band tokenIds
        if (narrowBandTokenId == 0) {
            narrowBandTokenId = tokenId;
        } else if (midBandTokenId == 0) {
            midBandTokenId = tokenId;
        } else if (wideBandTokenId == 0) {
            wideBandTokenId = tokenId;
        } else {
            // There are already 3 NFTs minted
            revert InvalidNFT();
        }
        // Return this value to confirm that the contract can receive ERC721 tokens
        return this.onERC721Received.selector;
    }
}
