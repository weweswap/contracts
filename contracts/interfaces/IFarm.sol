// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IFarm {
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

    function getPoolInfo(uint256 pid) external view returns (PoolInfo memory);
    function totalAllocPoint() external view returns (uint256);
    function deposit(uint256 pid, uint256, address to) external;
    function withdraw(uint256 pid, uint256 amount, address to) external;

    function harvest(uint256 pid, address to) external;
    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) external;
    function setVaultWeight(uint256 pid, uint8 weight) external;

    function refundAll() external;
    function refund(uint256 amount) external;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);

    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
    event Refunded(uint256 amount);
}
