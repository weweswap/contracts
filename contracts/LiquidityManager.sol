// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ILiquidityManagerFactory} from "./interfaces/ILiquidityManagerFactory.sol";

contract LiquidityManager is IERC721Receiver {
    address public immutable factory; // LMFactory
    address public immutable pool; // Original pool
    address public immutable nfpm; // Univ3 NFPM
    ILiquidityManagerFactory.PoolType public immutable poolType;

    bool public unlocked;
    uint256 public totalLiquidity; // Total liquidity deposited

    constructor() {
        (factory, nfpm, pool, poolType) = ILiquidityManagerFactory(msg.sender).parameters();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        // Return this value to confirm that the contract can receive ERC721 tokens
        return this.onERC721Received.selector;
    }
}
