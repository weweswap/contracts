// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../interfaces/IWeweReceiver.sol";

abstract contract Eater is IWeweReceiver, ReentrancyGuard, Pausable, Ownable {
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

    function _merge(uint256 amount, address token, address from) internal whenNotPaused {
        uint256 weweToTransfer = (amount * _rate) / 100;
        require(
            weweToTransfer <= IERC20(wewe).balanceOf(address(this)),
            "Eater: Insufficient token balance to transfer"
        );

        IERC20(token).transferFrom(from, address(this), amount);
        IERC20(wewe).transfer(from, weweToTransfer);

        emit Merged(amount, from);
    }

    function sweep() external onlyOwner {
        uint256 balance = IERC20(wewe).balanceOf(address(this));
        require(balance > 0, "Eater: No balance to sweep");
        IERC20(wewe).transfer(owner(), balance);
    }

    /// @notice Wewe token approveAndCall function
    function receiveApproval(
        address from,
        uint256 amount,
        address token,
        bytes calldata
    ) external nonReentrant whenNotPaused {
        // After wewe approve and call, it will call this function
        require(_token != address(0), "GenericEater: Token address not set");
        require(msg.sender == wewe, "GenericEater: Invalid sender");
        require(token == wewe, "GenericEater: Invalid token");

        // Eat the underlying token "_token" with the amount of "amount"
        _merge(amount, _token, from);
    }

    function togglePause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }

    function _deposit(uint256 amount) internal {
        IERC20(wewe).transferFrom(msg.sender, address(this), amount);
    }

    event Merged(uint256 amount, address indexed account);
    event RateChanged(uint256 newRate);
}
