// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IOwnable.sol";
import "../interfaces/IFarm.sol";
import "./ERC20.sol";

contract ChaosToken is ERC20, Ownable {
    IFarm private _farm;

    constructor() ERC20("ChaosToken", "CHAOS") {}

    function setFarm(address farm) external onlyOwner {
        _farm = IFarm(farm);
    }

    function collectEmmisions(uint256 pid) external {
        require(address(_farm) != address(0), "ChaosToken: Farm not set");
        _farm.harvest(pid, msg.sender);
    }
}
