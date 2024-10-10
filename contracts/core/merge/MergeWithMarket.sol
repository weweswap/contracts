// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../interfaces/IAMM.sol";
import {GenericMerge} from "./GenericMerge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MergeWithMarket is GenericMerge {
    constructor(address _wewe, address token) GenericMerge(_wewe, token) {}

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "MergeWithMarket: Insufficient balance to eat");

        // Sell the tokens, can fund the contract with the token
        IERC20(_token).approve(address(amm), amount);
        amm.swap(amount, _token, extraData);

        _merge(amount, _token, msg.sender);
    }
}
