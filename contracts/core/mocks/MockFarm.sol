// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IFarm.sol";
import "hardhat/console.sol";

contract MockFarm is IFarm {
    function getPoolInfo(uint256 pid) external pure returns (IFarm.PoolInfo memory) {
        return IFarm.PoolInfo({allocPoint: 0, lastRewardBlock: 0, accChaosPerShare: 0, totalSupply: 0, weight: 0});
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

    function harvest(uint256 pid, address to) external pure {
        console.log("harvest", pid, to);
    }

    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) external pure {
        console.log("withdrawAndHarvest", pid, amount, to);
    }

    function setVaultWeight(uint256 pid, uint8 weight) external pure {
        console.log("setVaultWeight", pid, weight);
    }

    function refundAll() external pure {
        console.log("refundAll");
    }

    function refund(uint256 amount) external pure {
        console.log("refund", amount);
    }
}
