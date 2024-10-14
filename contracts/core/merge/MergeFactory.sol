// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../../interfaces/IMergeV2.sol";
import {MergeWithMarket} from "./MergeWithMarket.sol";
import {GenericMerge} from "./GenericMerge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MergeFactory is Ownable {
    enum MergeType {
        Generic,
        WithMarket
    }

    address public constant wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;
    address[] public tokens;
    // token => merge
    mapping(address => address) public merges;
    mapping(address => MergeType) public mergeTypes;
    mapping(address => bool) public allowedDeployers;

    constructor() {
        allowedDeployers[msg.sender] = true;
    }

    function getMergeCount() external view returns (uint256) {
        return tokens.length;
    }

    function createMerge(address token, uint256 rate, uint8 vestingDuration) external onlyDeployer returns (address) {
        require(merges[token] == address(0), "MergeFactory: Merge already exists");
        address merge = address(new MergeWithMarket(token, wewe, vestingDuration));
        IMergeV2(merge).setRate(rate);
        _setMerge(token, merge);
        return merge;
    }

    function createMergeWithType(
        address token,
        uint256 rate,
        uint8 vestingDuration,
        MergeType mergeType
    ) external onlyDeployer returns (address) {
        require(merges[token] == address(0), "MergeFactory: Merge already exists");

        if (mergeType == MergeType.Generic) {
            address merge = address(new GenericMerge(wewe, token, vestingDuration));
            IMergeV2(merge).setRate(rate);
            _setMerge(token, merge);
            return merge;
        }

        if (mergeType == MergeType.WithMarket) {
            address merge = address(new MergeWithMarket(token, wewe, vestingDuration));
            IMergeV2(merge).setRate(rate);
            _setMerge(token, merge);
            return merge;
        }

        revert("MergeFactory: Invalid merge type");
    }

    function setMerge(address merge) external onlyOwner {
        address token = IMergeV2(merge).getToken();
        _setMerge(token, merge);
    }

    function setMergeWithType(address merge, MergeType mergeType) external onlyOwner {
        address token = IMergeV2(merge).getToken();
        _setMerge(token, merge);
        mergeTypes[token] = mergeType;
    }

    function setType(address token, MergeType mergeType) external onlyOwner {
        mergeTypes[token] = mergeType;
    }

    function _setMerge(address token, address merge) internal {
        require(token != address(0), "MergeFactory: Invalid merge");
        require(merges[token] == address(0), "MergeFactory: Merge already exists");
        tokens.push(token);
        merges[token] = merge;

        emit MergeCreated(token, merge);
    }

    function setAllowedDeployer(address deployer, bool allowed) external onlyOwner {
        allowedDeployers[deployer] = allowed;
    }

    modifier onlyDeployer() {
        require(allowedDeployers[msg.sender], "MergeFactory: Not allowed to deploy");
        _;
    }

    event MergeCreated(address indexed token, address indexed merge);
}
