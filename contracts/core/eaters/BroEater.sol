// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IEater.sol";
import "../../interfaces/IWeweReceiver.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BroEater is Eater, IWeweReceiver, IEater {
    address public constant underlying = 0x93750140C2EcEA27a53c6ed30380829607815A31;

    constructor(address _wewe) {
        _rate = 100;
        wewe = _wewe;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        _setRate(rate);
    }

    function eatAll() external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        _eat(balance, underlying, msg.sender);

        emit Eaten(balance, msg.sender);
    }

    function eat(uint256 amount) external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        require(balance >= amount, "BroEater: Insuffienct balance to eat");

        _eat(amount, underlying, msg.sender);

        emit Eaten(amount, msg.sender);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata) external {
        require(msg.sender == wewe, "BroEater: Invalid sender");
        require(token == wewe, "BroEater: Invalid token");

        uint256 weweToTransfer = amount * _rate;
        require(weweToTransfer >= IERC20(wewe).balanceOf(address(this)), "BroEater: Insufficient amount to transfer");

        IERC20(underlying).transferFrom(from, address(this), amount);
        IERC20(wewe).transfer(from, weweToTransfer);

        emit Eaten(amount, from);
    }
}
