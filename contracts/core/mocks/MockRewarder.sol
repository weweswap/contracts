// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IRewarder.sol";
import "hardhat/console.sol";

contract MockRewarder is IRewarder {
    function onChaosReward(uint256 pid, address user, address recipient, uint256 amount, uint256 newLpAmount) external {
        // console.log("onChaosReward", pid, user, recipient, amount, newLpAmount);
    }

    function pendingTokens(
        uint256 pid,
        address user,
        uint256 amount
    ) external pure returns (IERC20[] memory, uint256[] memory) {
        console.log("pendingTokens", pid, user, amount);
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(address(0));
    }
}
