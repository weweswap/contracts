// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IFarm.sol";

contract ChaosToken is ERC20, Ownable {
    IFarm private _farm;
    uint256 private constant _maxSupply = 1_000_000_000 * 1e18;

    constructor() ERC20("CHAOS", "CHAOS") {}

    function setFarm(address farm) external onlyOwner {
        _farm = IFarm(farm);
    }

    function mint(uint256 amount) public onlyOwner {
        require(address(_farm) != address(0), "ChaosToken: Farm not set");
        require(totalSupply() + amount <= _maxSupply, "ChaosToken: Max supply exceeded");
        _mint(address(_farm), amount);
    }

    function collectEmmisions(uint256 pid) external {
        require(address(_farm) != address(0), "ChaosToken: Farm not set");
        _farm.harvest(pid, msg.sender);
    }
}
