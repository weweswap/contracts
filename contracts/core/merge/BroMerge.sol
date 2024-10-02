// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IMergeV2.sol";
import "../../interfaces/IWeweReceiver.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BroMerge is Eater, IMergeV2 {
    function getToken() external view returns (address) {
        return _token;
    }

    constructor() {
        _rate = 100;
        _token = 0x93750140C2EcEA27a53c6ed30380829607815A31;
        wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;
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
        require(balance >= amount, "BroMerge: Insufficient balance");

        _merge(amount, _token, msg.sender);
    }

    // @notice Fund this contract with wewe token
    function deposit(uint256 amount) external onlyOwner {
        _deposit(amount);
    }
}
