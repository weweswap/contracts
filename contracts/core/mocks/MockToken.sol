// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../interfaces/IApproveAndCall.sol";
import "../../interfaces/IWeweReceiver.sol";

contract MockToken is ERC20, IApproveAndCall {
    bool public isApproveAndCall = true;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function setApproveAndCall(bool value) external {
        isApproveAndCall = value;
    }

    function approveAndCall(address spender, uint256 amount, bytes calldata extraData) external returns (bool) {
        _approve(msg.sender, spender, amount);
        IWeweReceiver(spender).receiveApproval(msg.sender, amount, address(this), extraData);

        return isApproveAndCall;
    }
}
