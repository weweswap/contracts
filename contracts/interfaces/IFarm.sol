// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IFarm {
    function setVaultWeight(address pid, uint256 weight) external;
}
