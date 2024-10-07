// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IMergeV2.sol";
import {GenericMerge} from "./GenericMerge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MergeFactory is Ownable {
    address public constant wewe = 0x0625Db97368dF1805314E68D0E63e5eB154B9AE6;
    address[] public tokens;
    mapping(address => address) public merges;

    function getMergeCount() external view returns (uint256) {
        return tokens.length;
    }

    function createMerge(address token, uint256 rate) external onlyOwner returns (address) {
        require(merges[token] == address(0), "MergeFactory: Merge already exists");
        address merge = address(new GenericMerge(token, wewe));
        IMergeV2(merge).setRate(rate);
        _setMerge(token, merge);
        return merge;
    }

    function setMerge(address token, address merge) private {
        _setMerge(token, merge);
    }

    function _setMerge(address token, address merge) internal {
        require(merges[token] == address(0), "MergeFactory: Merge already exists");
        tokens.push(token);
        merges[token] = merge;

        emit MergeCreated(token, merge);
    }

    event MergeCreated(address indexed token, address indexed merge);
}
