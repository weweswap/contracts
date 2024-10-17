// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../interfaces/IMergeV2.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GenericMerge is Eater, IMergeV2 {
    constructor(address _wewe, address token, uint32 _vestingDuration) {
        _rate = 100000;
        wewe = _wewe;
        _token = token;
        vestingDuration = _vestingDuration;
    }

    function canClaim(address account) external view returns (bool) {
        return vestings[account].end <= block.timestamp;
    }

    function balanceOf(address account) external view returns (uint256) {
        return vestings[account].amount;
    }

    function getToken() external view returns (address) {
        return _token;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        _setRate(rate);
    }

    function merge(uint256 amount) external virtual whenNotPaused whenSolvent(amount) {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "GenericMerge: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);
    }

    function claim() external whenNotPaused whenClaimable(msg.sender) {
        uint256 amount = vestings[msg.sender].amount;
        sumOfVested -= amount;
        vestings[msg.sender].amount = 0;

        IERC20(wewe).transfer(msg.sender, amount);
    }

    // @notice Fund this contract with wewe token
    function deposit(uint256 amount) external onlyOwner {
        _deposit(amount);
    }
}
