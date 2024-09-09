// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICHAOS {
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        int256 rewardDebt; // Reward debt. See explanation below.
    }

    struct PoolInfo {
        uint128 accChaosPerShare; // Accumulated SUSHI per share, times 1e12. See below.
        uint64 lastRewardBlock; // Last block number that SUSHI distribution occurs.
        uint64 allocPoint; // How many allocation points assigned to this pool. SUSHI to distribute per block.
        uint256 totalSupply; // CHAOS allocated to the pool
        uint8 weight; // Arbitrary weight for the pool
    }

    function getPoolInfo(uint256 pid) external view returns (ICHAOS.PoolInfo memory);
    function totalAllocPoint() external view returns (uint256);
    function deposit(uint256 pid, uint256, address to) external;
    function withdraw(uint256 pid, uint256 amount, address to) external;
}
