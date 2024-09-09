// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IFarm.sol";

contract ChaosToken is ERC777, Ownable {
    IFarm private _farm;

    constructor(address[] memory defaultOperators) ERC777("$CHAOS", "CHAOS", defaultOperators) {
        _mint(msg.sender, 1000000000 * 10 ** 18, "", "");
    }

    function setFarm(address farm) external onlyOwner {
        _farm = IFarm(farm);
    }

    function mint(uint256 amount) public onlyOwner {
        _mint(address(this), amount, "", "");
    }

    function collectEmmisions(uint256 pid) external {
        require(address(_farm) != address(0), "ChaosToken: Farm not set");
        // Collect the emmisions
        _farm.harvest(pid, msg.sender);
    }
}
