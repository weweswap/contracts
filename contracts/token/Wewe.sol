// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ERC20, ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWeweReceiver} from "../interfaces/IWeweReceiver.sol";

/**
 * @title ERC20Burnable based token contract
 */
contract Wewe is ERC20Burnable, Ownable {
    string private _name;
    string private _ticker;

    constructor() ERC20("", "") {
        _mint(_msgSender(), 100_000_000_000 * 1e18);
    }

    function mint(uint256 amount) external onlyOwner {
        _mint(_msgSender(), amount);
    }

    function setNameAndTicker(string calldata name_, string calldata ticker_) external onlyOwner {
        _name = name_;
        _ticker = ticker_;
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _ticker;
    }

    function approveAndCall(address spender, uint256 amount, bytes calldata extraData) external returns (bool) {
        // Approve the spender to spend the tokens
        _approve(msg.sender, spender, amount);

        // Call the receiveApproval function on the spender contract
        IWeweReceiver(spender).receiveApproval(msg.sender, amount, address(this), extraData);

        return true;
    }
}
