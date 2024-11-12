// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFeeManager {
    // Getter for the vault address
    function vault() external view returns (IERC20);

    // Getter for the USDC address
    function usdc() external view returns (IERC20);

    // Getter for accumulatedRewardsPerShare
    function accumulatedRewardsPerShare() external view returns (uint256);

    // Getter for a user's rewardDebt
    function rewardDebt(address _user) external view returns (uint256);

    // Getter for REWARDS_PRECISION
    function REWARDS_PRECISION() external view returns (uint256);

    // Function to emergency withdraw all the USDC of the contract (Only Owner)
    function withdrawEmergency() external;

    // Function to withdraw all CHAOS of the contract (Only Owner)
    function withdrawalChaos() external;

    // Set conversion rate between USDC and CHAOS (Only Owner)
    function setRate(uint256 rate) external;

    // Setter for a user's rewardDebt (can only be called by the vault)
    function setRewardDebt(address _user, uint256 _amount) external;

    // Function for users to claim their fees
    function claimFees(address claimer) external;

    // Function to deposit fees, can only be called by the vault
    function depositFees(
        address token0,
        uint256 fees0,
        address token1,
        uint256 fees1
    ) external;
}
