// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../interfaces/IAMM.sol";
import {GenericMerge} from "./GenericMerge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MergeWithMarket is GenericMerge {
    address public treasury;

    constructor(address _wewe, address token, uint8 _vestingDuration) GenericMerge(_wewe, token, _vestingDuration) {}

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function mergeAll() external override whenNotPaused {
        revert("Function disabled");
    }

    function merge(uint256 amount) external override whenNotPaused {
        revert("Function disabled");
    }

    function mergeAndSell(
        uint256 amount,
        IAMM amm,
        bytes calldata extraData
    ) external nonReentrant whenNotPaused whenSolvent {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "MergeWithMarket: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);

        // Approve the AMM to use the tokens now in this contract
        IERC20(_token).approve(address(amm), amount);

        // Sell the tokens, can fund the contract with the token
        address recipient = treasury == address(0) ? address(this) : treasury;
        amm.sell(amount, _token, recipient, extraData);
    }
}
