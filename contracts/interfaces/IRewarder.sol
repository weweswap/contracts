// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRewarder {
    function onChaosReward(uint256 pid, address user, address recipient, uint256 amount, uint256 newLpAmount) external;
    function pendingTokens(
        uint256 pid,
        address user,
        uint256 amount
    ) external returns (IERC20[] memory, uint256[] memory);
}
