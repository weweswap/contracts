// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IMigratorChef.sol";
import "hardhat/console.sol";

contract MockMigrator is IMigratorChef {
    function migrate(IERC20 token) external override returns (IERC20) {
        // console.log("Migrating %s", token);
        return IERC20(address(0));
    }
}
