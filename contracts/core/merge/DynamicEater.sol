// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../interfaces/IWeweReceiver.sol";

import "hardhat/console.sol";

struct Vesting {
    uint256 amount;
    uint256 end;
}

abstract contract DynamicEater is IWeweReceiver, ReentrancyGuard, Pausable, Ownable {
    int256 internal constant RATE_PRECISION = 100_000;
    address internal _token;
    address public wewe;

    uint256 internal _totalVested;
    uint256 internal _currentHeld;
    uint256 public maxSupply; // Max supply of tokens to eat

    int256 public constant maxRate = 120; // 120%
    int256 public constant minRate = 50; // -50%
    uint32 public vestingDuration;

    mapping(address => Vesting) public vestings;

    function totalVested() external view returns (uint256) {
        return _totalVested;
    }

    function slope() public pure returns (int256) {
        int256 dxdy = minRate - maxRate;
        return dxdy;
    }

    // Calculate the instantaneous rate
    function _getInstantaneousRate() internal view returns (uint256) {
        uint256 x1 = _totalVested;
        return _getRate(x1, x1 + 1);
    }

    // Calculate the amount of Wewe to transfer based on the current rate
    function _getCurrentRate(uint256 amount) internal view returns (uint256) {
        uint256 x1 = _totalVested;
        return _getRate(x1, x1 + amount);
    }

    // Function to calculate rewards based on spending amount using a linear decay model
    function getTotalWeWe(uint256 spendAmount) public pure returns (uint256) {
        // Parameters for the linear equation: y = -0.7 * x + 120, using a scaling factor of 100,000
        int256 dxdy = slope() * 1_000; // Representing -0.7 with a scaling factor of 1,000
        int256 intercept = maxRate * RATE_PRECISSION; // Representing 120 with a scaling factor of 100,000 "rate precission" (y-intercept)

        // Calculate reward based on the linear equation
        int256 reward = (dxdy * int256(spendAmount) + intercept) / RATE_PRECISSION;

        // Ensure reward is not negative
        if (reward < 0) {
            reward = 0;
        }

        return uint256(reward);
    }

    // x1 Lower bounds of the integral
    // x2 Upper bounds of the integral
    function _getRate(uint256 x1, uint256 x2) internal view returns (uint256) {
        // Slope is a constant, from max rate at 0 tokens, to min rate at max supply
        int256 dxdy = (minRate - maxRate) / int256(maxSupply);
        int256 intercept = maxRate * RATE_PRECISSION;

        // Calculate area using definite integration formula (y = mx + c) multiplied by 100_000 to keep precision
        int256 area1 = ((dxdy * int256(x2 ** 2)) / 2) * RATE_PRECISSION + intercept * int256(x2);
        int256 area2 = ((dxdy * int256(x1 ** 2)) / 2) * RATE_PRECISSION + intercept * int256(x1);
        int256 area = area1 - area2;

        // Adjust for the decimal factor used (divide by 100_000)
        require(area >= 0, "Area calculation resulted in a negative value");
        return uint256(area);
    }

    function _merge(uint256 amount, address token, address from) internal {
        uint256 weweToTransfer = getTotalWeWe(_totalVested + amount);
        _totalVested += weweToTransfer;

        require(
            weweToTransfer <= IERC20(wewe).balanceOf(address(this)),
            "DynamicEater: Insufficient token balance to transfer"
        );

        // Merge tokens from sender
        IERC20(token).transferFrom(from, address(this), amount);

        // If transfer, dont vest
        if (vestingDuration != 0) {
            // Curent vested
            uint256 vestedAmount = vestings[from].amount;
            vestings[msg.sender] = Vesting({
                amount: weweToTransfer + vestedAmount,
                end: block.timestamp + vestingDuration * 1 minutes
            });
        } else {
            // Transfer Wewe tokens to sender
            IERC20(wewe).transfer(from, weweToTransfer);
        }

        emit Merged(amount, from);
    }

    function sweep() external onlyOwner {
        uint256 balance = IERC20(wewe).balanceOf(address(this));
        require(balance > 0, "Eater: No balance to sweep");
        IERC20(wewe).transfer(owner(), balance);
    }

    /// @notice Wewe token approveAndCall function
    function receiveApproval(
        address from,
        uint256 amount,
        address,
        bytes calldata
    ) external nonReentrant whenNotPaused {
        // After wewe approve and call, it will call this function
        require(_token != address(0), "Eater: Token address not set");

        // Eat the underlying token "_token" with the amount of "amount"
        _merge(amount, _token, from);
    }

    function togglePause() external onlyOwner {
        paused() ? _unpause() : _pause();
    }

    function setVestingDuration(uint32 duration) external onlyOwner {
        vestingDuration = duration;
    }

    function _deposit(uint256 amount) internal {
        IERC20(wewe).transferFrom(msg.sender, address(this), amount);
    }

    modifier whenClaimable(address account) {
        // Set to 0 to disable vesting
        if (vestingDuration == 0) {
            _;
        }

        require(vestings[account].end <= block.timestamp, "Eater: Vesting not ended");
        _;
    }

    modifier whenSolvent(uint256 amountToMerge) {
        uint256 newAmountToVest = (amountToMerge * _getCurrentRate(amountToMerge)) / 100_000;
        require(
            IERC20(wewe).balanceOf(address(this)) >= _totalVested + newAmountToVest,
            "DynamicEater: Insufficient Wewe balance"
        );
        _;
    }

    event Merged(uint256 amount, address indexed account);
    event RateChanged(uint256 newRate);
}
