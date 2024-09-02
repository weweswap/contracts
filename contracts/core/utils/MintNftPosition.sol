// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.19;
pragma abicoder v2;

import "../../univ3-0.8/TickMath.sol";
import "../../univ3-0.8/TransferHelper.sol";
import "../../univ3-0.8/INonfungiblePositionManager.sol";
import "../../univ3-0.8/IUniswapV3Pool.sol";

contract MintNftPosition {
    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    address public immutable WEWE;
    address public immutable WETH;
    address public immutable POOL_ADDRESS;
    uint24 public constant poolFee = 10000;

    /// @notice Represents the deposit of an NFT
    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
    }

    constructor(address _token, address _poolAddress, INonfungiblePositionManager _nonfungiblePositionManager) {
        nonfungiblePositionManager = _nonfungiblePositionManager;
        WETH = 0x4200000000000000000000000000000000000006;
        WEWE = _token;
        POOL_ADDRESS = _poolAddress;
    }

    /// @notice Calls the mint function defined in periphery, mints the same amount of each token.
    /// For this example we are providing 1000 WEWE and 1000 WETH in liquidity
    /// @return tokenId The id of the newly minted ERC721
    /// @return liquidity The amount of liquidity for the position
    /// @return amount0 The amount of token0
    /// @return amount1 The amount of token1
    function mintNewPosition(
        uint256 amountToDeposit0,
        uint256 amountToDeposit1,
        address owner
    ) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) {
        // For this example, we will provide equal amounts of liquidity in both assets.
        // Providing liquidity in both assets means liquidity will be earning fees and is considered in-range.
        uint256 amount0ToMint = amountToDeposit0;
        uint256 amount1ToMint = amountToDeposit1;

        // transfer tokens to contract
        TransferHelper.safeTransferFrom(WETH, msg.sender, address(this), amount0ToMint);
        TransferHelper.safeTransferFrom(WEWE, msg.sender, address(this), amount1ToMint);

        // Approve the position manager
        TransferHelper.safeApprove(WETH, address(nonfungiblePositionManager), amount0ToMint);
        TransferHelper.safeApprove(WEWE, address(nonfungiblePositionManager), amount1ToMint);

        // Get the pool address
        address pool = POOL_ADDRESS;
        require(pool != address(0), "Pool doesn't exist");

        // Get tick spacing from the pool
        int24 tickSpacing = IUniswapV3Pool(pool).tickSpacing();

        // Define tickLower and tickUpper according to tickSpacing
        int24 tickLower = (TickMath.MIN_TICK / tickSpacing) * tickSpacing;
        int24 tickUpper = (TickMath.MAX_TICK / tickSpacing) * tickSpacing;

        // Ensure tickLower and tickUpper are valid multiples of tickSpacing
        require(tickLower % tickSpacing == 0, "tickLower is not a multiple of tickSpacing");
        require(tickUpper % tickSpacing == 0, "tickUpper is not a multiple of tickSpacing");

        // The values for tickLower and tickUpper may not work for all tick spacings.
        // Setting amount0Min and amount1Min to 0 is unsafe.
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: WETH,
            token1: WEWE,
            fee: poolFee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0ToMint,
            amount1Desired: amount1ToMint,
            amount0Min: 0,
            amount1Min: 0,
            recipient: owner,
            deadline: block.timestamp + 365 days
        });

        // Note that the pool defined by WEWE/WETH and fee tier 0.3% must already be created and initialized in order to mint
        (tokenId, liquidity, amount0, amount1) = nonfungiblePositionManager.mint(params);

        // Remove allowance and refund in both assets.
        if (amount0 < amount0ToMint) {
            TransferHelper.safeApprove(WETH, address(nonfungiblePositionManager), 0);
            uint256 refund0 = amount0ToMint - amount0;
            TransferHelper.safeTransfer(WETH, msg.sender, refund0);
        }

        if (amount1 < amount1ToMint) {
            TransferHelper.safeApprove(WEWE, address(nonfungiblePositionManager), 0);
            uint256 refund1 = amount1ToMint - amount1;
            TransferHelper.safeTransfer(WEWE, msg.sender, refund1);
        }

        return (tokenId, liquidity, amount0, amount1);
    }
}
