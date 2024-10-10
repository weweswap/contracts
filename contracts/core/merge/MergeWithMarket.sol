// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../interfaces/IAMM.sol";
import {GenericMerge} from "./GenericMerge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MergeWithMarket is GenericMerge {
    constructor(address _wewe, address token) GenericMerge(_wewe, token) {}

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external nonReentrant {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "MergeWithMarket: Insufficient balance to eat");

        // Send the token to this contract to merge
        _merge(amount, _token, msg.sender);

        // Approve the AMM to use the tokens now in this contract
        IERC20(_token).approve(address(amm), amount);

        // Sell the tokens, can fund the contract with the token
        amm.swap(amount, _token, address(this), extraData);
    }
}
