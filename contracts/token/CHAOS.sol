// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IOwnable.sol";
import "../interfaces/IFarm.sol";
import "../interfaces/IApproveAndCall.sol";
import {IWeweReceiver} from "../interfaces/IWeweReceiver.sol";

contract CHAOS is ERC20, IApproveAndCall, Ownable, ReentrancyGuard {
    IFarm private _farm;

    constructor() ERC20("CHAOS", "CHAOS") {}

    function setFarm(address farm) external onlyOwner {
        _farm = IFarm(farm);
    }

    function mint(uint256 amount) external onlyOwner {
        _mint(msg.sender, amount);
    }

    function mintToFarm(uint256 amount) external onlyOwner {
        require(address(_farm) != address(0), "CHAOS: Farm not set");
        _mint(address(_farm), amount);
    }

    function collectEmissions(uint256 pid) external {
        require(address(_farm) != address(0), "CHAOS: Farm not set");
        _farm.harvest(pid, msg.sender);
    }

    function approveAndCall(
        address spender,
        uint256 amount,
        bytes calldata extraData
    ) external nonReentrant returns (bool) {
        // Approve the spender to spend the tokens
        _approve(msg.sender, spender, amount);

        // Call the receiveApproval function on the spender contract
        IWeweReceiver(spender).receiveApproval(msg.sender, amount, address(this), extraData);

        return true;
    }
}
