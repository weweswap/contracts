// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {INonfungiblePositionManager} from "../univ3-0.8/INonfungiblePositionManager.sol";

import "hardhat/console.sol";

contract Migration is IERC721Receiver {

    INonfungiblePositionManager public immutable nfpm;
    address public immutable WEWE; 
    address public immutable WETH;

    struct PositionTokens {
        address token0;
        address token1;
    }

    constructor(address _nfpmAddress, address _WEWE, address _WETH) {
        nfpm = INonfungiblePositionManager(_nfpmAddress);
        WEWE = _WEWE;
        WETH = _WETH;
    }

    function _decreaseAllLiquidityAndCollectFees() private {
    }

    function _swap() private {
    }

    function getPositionTokens(uint256 tokenId) internal view returns (PositionTokens memory) {
        ( , , address token0, address token1, , , , , , , , ) = nfpm.positions(tokenId);
        return PositionTokens(token0, token1);
    }

    function isWEWEWETHPool(uint256 tokenId) internal view returns (bool) {
        PositionTokens memory tokens = getPositionTokens(tokenId);
        return (tokens.token0 == WEWE && tokens.token1 == WETH) || (tokens.token0 == WETH && tokens.token1 == WEWE);
        // return false;
    }

    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        require(isWEWEWETHPool(tokenId), "Invalid NFT: Not a WEWE-WETH pool token");
        _decreaseAllLiquidityAndCollectFees();
        _swap();
        return IERC721Receiver.onERC721Received.selector;
    }
}
