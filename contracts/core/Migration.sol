// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {INonfungiblePositionManager} from "../univ3-0.8/INonfungiblePositionManager.sol";
import {IV3SwapRouter} from "../univ3-0.8/IV3SwapRouter.sol";
import {ISwapRouter02} from "../univ3-0.8/ISwapRouter02.sol";
import {TransferHelper} from "../univ3-0.8/TransferHelper.sol";
import {ILiquidityManagerFactory} from "../interfaces/ILiquidityManagerFactory.sol";
import {IArrakisV2Resolver} from "../arrakis/interfaces/IArrakisV2Resolver.sol";
import {IArrakisV2} from "../arrakis/interfaces/IArrakisV2.sol";
import {IQuoterV2} from "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

/// @title Migration Contract for Uniswap v3 Positions
/// @notice This contract is used to migrate liquidity positions from Uniswap v3, decrease liquidity, collect fees, change the unselected token to USDC and deposit all liquidity in a WEWESwap protocol liquidityManager.
contract Migration is IERC721Receiver {
    using SafeERC20 for IERC20;

    /// @notice Address of the Uniswap NonfungiblePositionManager contract
    INonfungiblePositionManager public immutable nfpm;

    /// @notice Address of the Arrakis resolver contract
    IArrakisV2Resolver public immutable resolverV2;

    /// @notice Address of the Arrakis V2 contract
    IArrakisV2 public immutable arrakisV2;

    /// @notice Address of the Uniswap SwapRouter02 contract
    ISwapRouter02 public immutable swapRouter;

    /// @notice Address of the token to be migrated
    address public immutable tokenToMigrate;

    /// @notice Address of the USDC token
    address public immutable usdc;

    /// @notice Fee tier used in the Uniswap SwapRouter02 contract
    uint24 public immutable feeTier;

    /// @notice Address of the Uniswap QuoterV2 contract
    IQuoterV2 public immutable quoter;

    /// @notice Constructor to initialize the Migration contract
    /// @param _nfpm Address of the Uniswap NonfungiblePositionManager
    /// @param _swapRouter Address of the Uniswap SwapRouter02
    /// @param _arrakisV2 Address of the Arrakis V2 contract
    /// @param _resolverV2 Address of the Arrakis V2 resolver contract
    /// @param _quoter Address of the Uniswap QuoterV2 contract
    /// @param _tokenToMigrate Address of the token to be migrated
    /// @param _usdc Address of the USDC token
    /// @param _feeTier Fee tier for the Uniswap swap
    constructor(
        address _nfpm,
        address _swapRouter,
        address _arrakisV2,
        address _resolverV2,
        address _quoter,
        address _tokenToMigrate,
        address _usdc,
        uint24 _feeTier
    ) {
        require(_nfpm != address(0), "INPM");
        require(_swapRouter != address(0), "ISR");
        require(_arrakisV2 != address(0), "IA");
        require(_resolverV2 != address(0), "IAR");
        require(_quoter != address(0), "IQ");
        require(_tokenToMigrate != address(0), "ITM");
        require(_usdc != address(0), "IUSDC");
        swapRouter = ISwapRouter02(_swapRouter);
        nfpm = INonfungiblePositionManager(_nfpm);
        arrakisV2 = IArrakisV2(_arrakisV2);
        resolverV2 = IArrakisV2Resolver(_resolverV2);
        quoter = IQuoterV2(_quoter);
        tokenToMigrate = _tokenToMigrate;
        usdc = _usdc;
        feeTier = _feeTier;
    }

    /// @notice Decreases all liquidity for a given token ID
    /// @dev Calls the decreaseLiquidity function on the NonfungiblePositionManager contract
    /// @param tokenId The ID of the token representing the liquidity position
    function _decreaseAllLiquidity(uint256 tokenId) private {
        (, , , , , , , uint128 liquidity, , , , ) = nfpm.positions(tokenId);
        require(liquidity > 0, "NLP");

        nfpm.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
    }

    /// @notice Collects all liquidity for a given token ID
    /// @dev Calls the collect function on the NonfungiblePositionManager contract
    /// @param tokenId The ID of the token representing the liquidity position
    /// @return amount0 The amount of token0 collected
    /// @return amount1 The amount of token1 collected
    function _collectAllLiquidity(uint256 tokenId) private returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = nfpm.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    /// @notice Decreases liquidity and collects fees for a given token ID
    /// @dev Combines _decreaseAllLiquidity and _collectAllLiquidity in a single function
    /// @param tokenId The ID of the token representing the liquidity position
    /// @return collectedAmount0 The amount of token0 collected
    /// @return collectedAmount1 The amount of token1 collected
    function _decreaseAllLiquidityAndCollectFees(
        uint256 tokenId
    ) private returns (uint256 collectedAmount0, uint256 collectedAmount1) {
        _decreaseAllLiquidity(tokenId);
        (collectedAmount0, collectedAmount1) = _collectAllLiquidity(tokenId);
    }

    /// @notice Swaps a specified amount of a given token to USDC
    /// @dev Executes a swap on the Uniswap SwapRouter02 contract
    /// @param tokenIn The address of the token to be swapped
    /// @param amountIn The amount of the token to be swapped
    /// @return amountOut The amount of USDC received from the swap
    function _swap(address tokenIn, uint256 amountIn) private returns (uint256 amountOut) {
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        IQuoterV2.QuoteExactInputSingleParams memory paramsQuote = IQuoterV2.QuoteExactInputSingleParams({
            tokenIn: address(tokenIn),
            tokenOut: address(usdc),
            amountIn: amountIn,
            fee: feeTier,
            sqrtPriceLimitX96: 0
        });

        (uint256 estimationOut, , , ) = quoter.quoteExactInputSingle(paramsQuote);

        uint256 slippageTolerance = 95;
        uint256 amountOutMinimum = (estimationOut * slippageTolerance) / 100;

        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: usdc,
            fee: feeTier,
            recipient: address(this),
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }

    /// @notice Retrieves the tokens associated with a given liquidity position
    /// @param tokenId The ID of the token representing the liquidity position
    /// @return token0 The address of token0 in the liquidity pair
    /// @return token1 The address of token1 in the liquidity pair
    function _getPositionTokens(uint256 tokenId) internal view returns (address token0, address token1) {
        (, , token0, token1, , , , , , , , ) = nfpm.positions(tokenId);
    }

    /// @notice Validates if the position is associated with the token to be migrated
    /// @param token0 The address of token0 in the liquidity pair
    /// @param token1 The address of token1 in the liquidity pair
    /// @return bool True if the position contains the token to be migrated, false otherwise
    function _isValidNftPosition(address token0, address token1) internal view returns (bool) {
        return (token0 == tokenToMigrate || token1 == tokenToMigrate);
    }

    /// @notice Determines which token and amount should be swapped based on the liquidity position
    /// @param token0 The address of token0 in the liquidity pair
    /// @param token1 The address of token1 in the liquidity pair
    /// @param amountToken0 The amount of token0 available in the contract
    /// @param amountToken1 The amount of token1 available in the contract
    /// @return The address of the token to be swapped and the amount
    function _getTokenAndAmountToSwap(
        address token0,
        address token1,
        uint256 amountToken0,
        uint256 amountToken1
    ) internal view returns (address, uint256) {
        if (token0 == tokenToMigrate) {
            return (token1, amountToken1);
        } else if (token1 == tokenToMigrate) {
            return (token0, amountToken0);
        } else {
            revert("No matching token found for migration");
        }
    }

    /// @notice Handles the approval and reset of the safeApprove
    /// @dev This function first sets the approval to 0 and then sets the new approval amount
    /// @param tokenContract The ERC20 token contract that we are approving
    /// @param spender The address of the spender (the contract or account that will be allowed to transfer the tokens)
    /// @param amount The amount of tokens to approve for the spender
    function _safeApproveToken(IERC20 tokenContract, address spender, uint256 amount) private {
        tokenContract.safeApprove(spender, 0);
        tokenContract.safeApprove(spender, amount);
    }

    /// @notice Handles the receipt of an ERC721 token (liquidity position NFT)
    /// @dev This function is called when the contract receives an ERC721 token via safeTransferFrom.
    /// It validates the NFT, decreases liquidity, collects fees, and swaps the resulting tokens to USDC then deposit on the liquidity manager.
    /// @param operator The address which called safeTransferFrom to transfer the NFT
    /// @param from The previous owner of the given token ID
    /// @param tokenId The ID of the token representing the liquidity position
    /// @param data Additional data with no specified format, sent in call to safeTransferFrom
    /// @return The selector for ERC721 receipt, which confirms the receipt of the token
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        (address token0, address token1) = _getPositionTokens(tokenId);
        require(_isValidNftPosition(token0, token1), "INFT");

        (uint256 amountToken0, uint256 amountToken1) = _decreaseAllLiquidityAndCollectFees(tokenId);
        (address tokenIn, uint256 amountIn) = _getTokenAndAmountToSwap(token0, token1, amountToken0, amountToken1);

        uint256 usdcAmount = _swap(tokenIn, amountIn);

        uint256 tokenToMigrateAmount = 0;

        if (token0 == tokenToMigrate) {
            tokenToMigrateAmount = amountToken0;
        } else if (token1 == tokenToMigrate) {
            tokenToMigrateAmount = amountToken1;
        }

        _depositAndMint(tokenToMigrate, tokenToMigrateAmount, usdc, usdcAmount, from);

        return IERC721Receiver.onERC721Received.selector;
    }

    function _depositAndMint(
        address token0,
        uint256 amount0Max,
        address token1,
        uint256 amount1Max,
        address receiver
    ) private returns (uint256 amountMinted) {
        (uint256 amount0, uint256 amount1, uint256 mintAmount) = resolverV2.getMintAmounts(
            arrakisV2,
            amount0Max,
            amount1Max
        );

        IERC20 token0Contract = IERC20(token0);
        IERC20 token1Contract = IERC20(token1);

        _safeApproveToken(token0Contract, address(arrakisV2), amount0);
        _safeApproveToken(token1Contract, address(arrakisV2), amount1);

        (uint256 depositedAmount0, uint256 depositedAmount1) = arrakisV2.mint(mintAmount, receiver);

        if (depositedAmount0 < amount0Max) {
            token0Contract.safeTransfer(receiver, amount0Max - depositedAmount0);
        }

        if (depositedAmount1 < amount1Max) {
            token1Contract.safeTransfer(receiver, amount1Max - depositedAmount1);
        }

        return mintAmount;
    }
}
