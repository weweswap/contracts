// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Migrate is IERC721Receiver {

    constructor() {
    }

    function _decreaseAllLiquidityAndCollectFees() private {
    }

    function _swap() private {
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        // 1. Receive NFT possition
        // 2. Call method _decreaseAllLiquidityAndCollectFees
        // 3. Call swap (All WETH to USDC)
        // 4. Call deposit of Liquidity Manager
        // 5. Get ERC20 token
        // 6. Send to user
    }
}
