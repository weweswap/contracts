// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IEater.sol";
import "../../interfaces/IWeweReceiver.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract GenericEater is Eater, IWeweReceiver, IEater {
    address public immutable underlying;

    constructor(address _wewe, address _underlying) {
        _rate = 1;
        wewe = _wewe;
        underlying = _underlying;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        require(_rate > 0, "GenericEater: Rate must be greater than 0");

        if (_rate != rate) {
            _rate = rate;
        }
    }

    function eatAll() external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        _eat(balance, underlying, msg.sender);

        emit Eaten(balance, msg.sender);
    }

    function eat(uint256 amount) external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        require(balance >= amount, "GenericEater: Insuffienct balance to eat");

        _eat(amount, underlying, msg.sender);

        emit Eaten(amount, msg.sender);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata) external {
        require(msg.sender == wewe, "GenericEater: invalid sender");
        require(token == wewe, "GenericEater: invalid token");

        uint256 weweToTransfer = amount * _rate;
        require(
            weweToTransfer >= IERC20(wewe).balanceOf(address(this)),
            "GenericEater: Insufficient amount to transfer"
        );

        IERC20(underlying).transferFrom(from, address(this), amount);
        IERC20(wewe).transfer(from, weweToTransfer);

        emit Eaten(amount, from);
    }
}
