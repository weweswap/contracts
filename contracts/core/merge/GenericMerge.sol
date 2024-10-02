// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IMergeV2.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GenericMerge is Eater, IMergeV2 {
    function getToken() external view returns (address) {
        return _token;
    }

    constructor(address _wewe, address token) {
        _rate = 100;
        wewe = _wewe;
        _token = token;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        _setRate(rate);
    }

    function mergeAll() external {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        _merge(balance, _token, msg.sender);
    }

    function merge(uint256 amount) external {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "GenericMerge: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);
    }

    // @notice Fund this contract with wewe token
    function deposit(uint256 amount) external onlyOwner {
        _deposit(amount);
    }
}
