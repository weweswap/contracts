// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/ICHAOS.sol";
import "hardhat/console.sol";

contract MockChaos is ICHAOS {
    function getPoolInfo(uint256 pid) external pure returns (ICHAOS.PoolInfo memory) {
        return ICHAOS.PoolInfo({allocPoint: 0, lastRewardBlock: 0, accChaosPerShare: 0, totalSupply: 0, weight: 0});
    }

    function totalAllocPoint() external pure returns (uint256) {
        return 0;
    }

    function deposit(uint256 pid, uint256 amount, address to) external pure {
        console.log("deposit", pid, amount, to);
    }

    function withdraw(uint256 pid, uint256 amount, address to) external pure {
        console.log("withdraw", pid, amount, to);
    }
}
