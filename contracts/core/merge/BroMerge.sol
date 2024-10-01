// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IMergeV2.sol";
import "../../interfaces/IWeweReceiver.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BroMerge is Eater, IWeweReceiver, IMergeV2, ReentrancyGuard {
    address private constant _token = 0x93750140C2EcEA27a53c6ed30380829607815A31;

    function getToken() external pure returns (address) {
        return _token;
    }

    constructor() {
        _rate = 100;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        _setRate(rate);
    }

    function depositAll() external {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        _eat(balance, _token, msg.sender);
    }

    function deposit(uint256 amount) external {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "BroMerge: Insufficient balance");

        _eat(amount, _token, msg.sender);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata) external nonReentrant {
        require(msg.sender == wewe, "BroMerge: Invalid sender");
        require(token == wewe, "BroMerge: Invalid token");

        _eat(amount, _token, from);
    }
}
