// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/ICHAOS.sol";

import "hardhat/console.sol";

contract MockChaos is ICHAOS {
    function poolInfo(uint256 pid) external view returns (ICHAOS.PoolInfo memory) {
        return ICHAOS.PoolInfo({lpToken: IERC20(address(0)), allocPoint: 0, lastRewardBlock: 0, accSushiPerShare: 0});
    }

    function totalAllocPoint() external view returns (uint256) {
        return 0;
    }

    function deposit(uint256 _pid, uint256 _amount) external {
        console.log("deposit", _pid, _amount);
    }
}
