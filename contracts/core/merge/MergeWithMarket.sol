// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../interfaces/IAMM.sol";
import {GenericMerge} from "./GenericMerge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MergeWithMarket is GenericMerge {
    constructor(address _wewe, address token) GenericMerge(_wewe, token) {}

    address public treasury;

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external nonReentrant {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "MergeWithMarket: Insufficient balance to eat");

        // Send the token to this contract to merge
        _merge(amount, _token, msg.sender);

        // Approve the AMM to use the tokens now in this contract
        IERC20(_token).approve(address(amm), amount);

        // Sell the tokens, can fund the contract with the token
        address recipient = treasury == address(0) ? address(this) : treasury;
        amm.sell(amount, _token, recipient, extraData);
    }
}
