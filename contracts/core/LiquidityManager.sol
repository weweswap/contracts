// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IUniswapV3Factory} from "../univ3-0.8/IUniswapV3Factory.sol";
import {INonfungiblePositionManager} from "../univ3-0.8/INonfungiblePositionManager.sol";
import {ILiquidityManager} from "../interfaces/ILiquidityManager.sol";
import {ILiquidityManagerFactory} from "../interfaces/ILiquidityManagerFactory.sol";
import {TransferHelper} from "../univ3-0.8/TransferHelper.sol";
import {IV3SwapRouter} from "../univ3-0.8/IV3SwapRouter.sol";
import {ISwapRouter02} from "../univ3-0.8/ISwapRouter02.sol";

contract LiquidityManager is Ownable, Pausable, ReentrancyGuard, ILiquidityManager, IERC721Receiver {
    using SafeERC20 for IERC20;

    ILiquidityManagerFactory public immutable factory; // LMFactory
    address public immutable ksZapRouter; // Zap router address
    INonfungiblePositionManager public immutable nfpm; // Univ3 NFPM
    IERC20 public immutable token; // Token address
    IERC20 public immutable usdc; // Token address
    address public immutable pool; // Token-USDC pool
    ILiquidityManagerFactory.PoolType public immutable poolType;
    ISwapRouter02 public immutable swapRouter;

    ILiquidityManagerFactory.PoolConfiguration public poolConfiguration;
    ZapInParams public zapInParams; // Temporary bandType and tokenId to validate if it's mint or addLiquidity
    mapping(BandType => uint256) public bandTokenId; // Band tokenIds
    mapping(BandType => uint128) public totalLiquidityForBand; // Total liquidity deposited
    mapping(address => mapping(BandType => uint128)) public liquidities; // Deposited liquidity

    event FeesCollected(uint256 totalAmountUSDC);

    error ZeroAmount();
    error NotAllowedRebalancer();
    error BandDepositFailed(bytes data);
    error NotZappingIn();
    error InvalidNFT();
    error InvalidZapInBandType(BandType inputType, BandType correctType);

    constructor() {
        address _lmfactory;
        address _token;
        address _usdc;
        address _nfpm;
        address _swapRouter;
        (_lmfactory, ksZapRouter, _nfpm, _token, _usdc, pool, poolType, _swapRouter) = ILiquidityManagerFactory(
            msg.sender
        ).lmParameters();
        (
            uint256 targetPriceRange,
            uint256 narrowBandDelta,
            uint256 midBandDelta,
            uint256 wideBandDelta,
            uint24 fee
        ) = ILiquidityManagerFactory(msg.sender).getPoolConfiguration(poolType);

        factory = ILiquidityManagerFactory(_lmfactory);
        token = IERC20(_token);
        usdc = IERC20(_usdc);
        nfpm = INonfungiblePositionManager(_nfpm);
        swapRouter = ISwapRouter02(_swapRouter);

        poolConfiguration = ILiquidityManagerFactory.PoolConfiguration(
            targetPriceRange,
            narrowBandDelta,
            midBandDelta,
            wideBandDelta,
            fee
        );
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function renounceOwnership() public override(ILiquidityManager, Ownable) {
        Ownable.renounceOwnership();
    }

    function rebalance() external {
        if (!factory.rebalancers(msg.sender)) {
            revert NotAllowedRebalancer();
        }
        // Implement rebalance
    }

    function zapIn(uint256 amount, BandType bandType, bytes calldata bandData) external nonReentrant whenNotPaused {
        if (amount == 0) {
            revert ZeroAmount();
        }

        BandType correctBandType = getBandTypeForZapIn();
        if (correctBandType != bandType) {
            revert InvalidZapInBandType(bandType, correctBandType);
        }

        // Store zapInBandTokenId, and inside onERC721Received, will validate if new NFT is minted or not
        zapInParams = ZapInParams({zappingIn: true, bandType: bandType, tokenId: bandTokenId[bandType]});

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

        totalLiquidityForBand[bandType] += zapResult.liquidity;
        liquidities[msg.sender][bandType] += zapResult.liquidity;

        delete zapInParams;
    }

    function collectFees() public {
        (uint256 narrowAmount0, uint256 narrowAmount1) = _collectBandFees(BandType.Narrow);
        (uint256 midAmount0, uint256 midAmount1) = _collectBandFees(BandType.Mid);
        (uint256 wideAmount0, uint256 wideAmount1) = _collectBandFees(BandType.Wide);

        uint256 totalFeesToken;
        uint256 totalFeesUSDC;

        if (address(token) < address(usdc)) {
            totalFeesToken = narrowAmount0 + midAmount0 + wideAmount0;
            totalFeesUSDC = narrowAmount1 + midAmount1 + wideAmount1;
        } else {
            totalFeesToken = narrowAmount1 + midAmount1 + wideAmount1;
            totalFeesUSDC = narrowAmount0 + midAmount0 + wideAmount0;
        }

        if (totalFeesToken > 0) {
            TransferHelper.safeApprove(address(token), address(swapRouter), totalFeesToken);

            IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
                tokenIn: address(token),
                tokenOut: address(usdc),
                fee: poolConfiguration.fee, // TODO: Check if this is a good choice
                recipient: address(this),
                amountIn: totalFeesToken,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
            uint256 amountOut = swapRouter.exactInputSingle(params);

            totalFeesUSDC += amountOut;
        }
        emit FeesCollected(totalFeesUSDC);
    }

    function withdraw(BandType bandType) external nonReentrant {
        // Withdraw liquidity from a band
        uint128 liquidity = liquidities[msg.sender][bandType];
        if (liquidity == 0) {
            revert ZeroAmount();
        }

        // amount0Min and amount1Min are price slippage checks
        // if the amount received after burning is not greater than these minimums, transaction will fail
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager
            .DecreaseLiquidityParams({
                tokenId: bandTokenId[bandType],
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });

        (uint256 amount0, uint256 amount1) = nfpm.decreaseLiquidity(params);

        //send liquidity back to owner
        // _sendToOwner(tokenId, amount0, amount1);
    }

    function _ksZapIn(bytes calldata data) private returns (ZapUniswapV3Results memory zapResult) {
        (bool success, bytes memory zapResultData) = ksZapRouter.call(data);
        if (!success) {
            revert BandDepositFailed(data);
        }

        zapResult = abi.decode(zapResultData, (ZapUniswapV3Results));
    }

    function getBandTypeForZapIn() public view returns (BandType) {
        // Find minimum liquidity
        uint256 minLiquidity = _min(
            totalLiquidityForBand[BandType.Narrow],
            totalLiquidityForBand[BandType.Mid],
            totalLiquidityForBand[BandType.Wide]
        );

        if (totalLiquidityForBand[BandType.Narrow] == minLiquidity) {
            return BandType.Narrow;
        }
        if (totalLiquidityForBand[BandType.Mid] == minLiquidity) {
            return BandType.Mid;
        }

        return BandType.Wide;
    }

    function totalLiquidity() external view returns (uint256) {
        return
            totalLiquidityForBand[BandType.Narrow] +
            totalLiquidityForBand[BandType.Mid] +
            totalLiquidityForBand[BandType.Wide];
    }

    function liquidityOf(address user) external view returns (uint256) {
        return liquidities[user][BandType.Narrow] + liquidities[user][BandType.Mid] + liquidities[user][BandType.Wide];
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        if (!zapInParams.zappingIn) {
            // NFTs should be minted only during zapIn
            revert NotZappingIn();
        }

        if (zapInParams.tokenId != 0) {
            // Band NFT is already minted
            revert InvalidNFT();
        }

        // Store newly minted tokenId
        bandTokenId[zapInParams.bandType] = tokenId;

        // Return this value to confirm that the contract can receive ERC721 tokens
        return this.onERC721Received.selector;
    }

    function _min(uint256 a, uint256 b, uint256 c) private pure returns (uint256) {
        uint256 minValue = a;

        if (b < minValue) {
            minValue = b;
        }
        if (c < minValue) {
            minValue = c;
        }

        return minValue;
    }

    function _collectBandFees(BandType bandType) private returns (uint256 amount0, uint amount1) {
        uint256 tokenId = bandTokenId[bandType];
        if (tokenId == 0) {
            revert InvalidNFT();
        }

        (amount0, amount1) = nfpm.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }
}
