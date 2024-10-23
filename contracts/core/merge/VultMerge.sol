// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWeweReceiver} from "../../interfaces/IWeweReceiver.sol";
import {IERC1363Spender} from "../../token/ERC1363/IERC1363Spender.sol";
import {IMerge} from "../../interfaces/IMerge.sol";
import {DynamicEater} from "./DynamicEater.sol";
import "../../interfaces/IAMM.sol";

contract VultMerge is DynamicEater, IMerge, IERC1363Spender {
    using SafeERC20 for IERC20;

    address public treasury;
    uint256 public weweBalance;
    LockedStatus public lockedStatus;

    function canClaim(address account) external view returns (bool) {
        return vestings[account].end <= block.timestamp;
    }

    function balanceOf(address account) external view returns (uint256) {
        return vestings[account].amount;
    }

    function getToken() external view returns (address) {
        return _token;
    }

    function getRate() external view returns (uint256) {
        return _getInstantaneousRate();
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    constructor(address _wewe, address _vult, uint32 _vestingDuration, uint256 _maxSupply) {
        wewe = _wewe;
        _token = _vult;
        vestingDuration = _vestingDuration;
        maxSupply = _maxSupply;
    }

    /*
     * @inheritdoc IERC1363Spender
     * Vult token approveAndCall
     */
    function onApprovalReceived(
        address from,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant returns (bytes4) {
        if (msg.sender != _token) {
            revert InvalidTokenReceived();
        }
        if (lockedStatus != LockedStatus.TwoWay) {
            revert VultToWeweNotAllwed();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        _merge(amount, _token, from);

        return this.onApprovalReceived.selector;
    }

    function setLockedStatus(LockedStatus newStatus) external onlyOwner {
        lockedStatus = newStatus;
    }

    function setVirtualWeweBalance(uint256 newVirtualBalance) external onlyOwner {
        maxSupply = newVirtualBalance;
    }

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external nonReentrant whenNotPaused {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "VultMerge: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);

        // Approve the AMM to use the tokens now in this contract
        IERC20(_token).approve(address(amm), amount);

        // Sell the tokens, can fund the contract with the token
        address recipient = treasury == address(0) ? address(this) : treasury;
        amm.sell(amount, _token, recipient, extraData);
    }

    function merge(uint256 amount) external virtual whenNotPaused {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "VultMerge: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);
    }

    function claim() external whenNotPaused whenClaimable(msg.sender) {
        uint256 amount = vestings[msg.sender].amount;
        vestings[msg.sender].amount = 0;

        IERC20(wewe).transfer(msg.sender, amount);
    }

    // @notice Fund this contract with wewe token
    function deposit(uint256 amount) external onlyOwner {
        _deposit(amount);
    }

    function depositRequired() external onlyOwner {
        uint256 amount = _getCurrentRate(maxSupply - _totalVested);
        _deposit(amount);
    }
}
