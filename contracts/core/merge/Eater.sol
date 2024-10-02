// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../interfaces/IWeweReceiver.sol";

abstract contract Eater is IWeweReceiver, ReentrancyGuard, Ownable {
    uint256 internal _rate;
    address internal _token;
    address public wewe;

    function _setRate(uint256 rate) internal {
        require(rate > 0, "Eater: Rate must be greater than 0");

        if (_rate != rate) {
            _rate = rate;
            emit RateChanged(rate);
        }
    }

    function _eat(uint256 amount, address token, address from) internal {
        uint256 weweToTransfer = (amount * _rate) / 100;
        require(
            weweToTransfer <= IERC20(wewe).balanceOf(address(this)),
            "Eater: Insufficient token balance to transfer"
        );

        IERC20(token).transferFrom(from, address(this), amount);
        IERC20(wewe).transfer(from, weweToTransfer);

        emit Eaten(amount, from);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata) external nonReentrant {
        // After wewe approve and call, it will call this function
        require(token != address(0), "GenericEater: Token address not set");
        require(msg.sender == wewe, "GenericEater: Invalid sender");
        require(token == wewe, "GenericEater: Invalid token");

        // Eat the underlying token "_token" with the amount of "amount"
        _eat(amount, _token, from);
    }

    event Eaten(uint256 amount, address indexed account);
    event RateChanged(uint256 newRate);
}
