// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../interfaces/IWeweReceiver.sol";
import "../../interfaces/IAMM.sol";

struct Vesting {
    uint256 amount;
    uint256 end;
}

contract DynamicEater is IWeweReceiver, ReentrancyGuard, Pausable, Ownable {
    int256 internal constant RATE_PRECISION = 100_000;
    address internal token;
    address public wewe;
    address public treasury;

    uint256 internal _totalVested;
    uint256 internal _currentHeld;
    uint256 public maxSupply; // Max supply of tokens to eat
    uint32 public vestingDuration;

    mapping(address => Vesting) public vestings;
    mapping(address => bool) public whiteList;

    // Initial virtual balances
    uint256 public virtualFOMO; // FOMO balance
    uint256 public virtualWEWE; // WEWE balance

    uint256 constant SCALING_FACTOR = 1_000;

    function _getWeweBalance() internal view returns (uint256) {
        // Virtual WEWE balance in 10^18 and total vested in 10^18
        return virtualWEWE - _totalVested;
    }

    function getCurrentPrice() public view returns (uint256) {
        // Calculate the price with scaling factor (p = Y / X)
        // Price in percentage, scaled by 1000 (i.e., 1.25% would be 12.5 scaled by 1000)
        uint256 _weweBalance = _getWeweBalance();
        return (_weweBalance * SCALING_FACTOR) / virtualFOMO;
    }

    function canClaim(address account) external view returns (bool) {
        return vestings[account].end <= block.timestamp;
    }

    function balanceOf(address account) external view returns (uint256) {
        return vestings[account].amount;
    }

    function getToken() external view returns (address) {
        return token;
    }

    function getRate() external view returns (uint256) {
        uint256 decimals = IERC20Metadata(token).decimals();
        return _calculateTokensOut(10 ** decimals);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function totalVested() external view returns (uint256) {
        return _totalVested;
    }

    constructor(address _wewe, address _token, uint32 _vestingDuration, uint256 _virtualFOMO, uint256 _virtualWEWE) {
        wewe = _wewe;
        token = _token;
        vestingDuration = _vestingDuration;

        uint256 decimals = IERC20Metadata(_token).decimals();
        if (decimals < 18) {
            _virtualFOMO = _virtualFOMO * (10 ** (18 - decimals));
        }

        // Initial virtual balances in 10^18
        virtualFOMO = _virtualFOMO;
        virtualWEWE = _virtualWEWE;
    }

    function setWhiteList(address account) external onlyOwner {
        whiteList[account] = true;
    }

    function setVirtualWeWEBalance(uint256 value) external onlyOwner {
        virtualWEWE = value;
    }

    function setVirtualTokenBalance(uint256 value) external onlyOwner {
        virtualFOMO = value;
    }

    function calculateTokensOut(uint256 x) public view returns (uint256) {
        // Check casting where x is the token value
        uint256 decimals = IERC20Metadata(token).decimals();
        if (decimals < 18) {
            x = x * (10 ** (18 - IERC20Metadata(token).decimals()));
        }

        return _calculateTokensOut(x);
    }

    // Function to simulate adding 1 more FOMO and get the new price
    function _calculateTokensOut(uint256 additionalFomo) private view returns (uint256) {
        // Update the virtual balance for FOMO
        // (x+X) where x is the additional FOMO
        uint256 newFOMOBalance = virtualFOMO + additionalFomo;

        // y = (x*Y) / (x+X)
        uint256 Y = virtualWEWE;
        Y -= _totalVested;

        uint256 y = (additionalFomo * Y) / newFOMOBalance;

        return y;
    }

    function _merge(uint256 amount, address from) internal returns (uint256) {
        // x = amount in 10^18 and result is 10^18
        // uint256 x = _totalVested + amount;
        uint256 weweToTransfer = _calculateTokensOut(amount);

        require(
            weweToTransfer <= IERC20(wewe).balanceOf(address(this)),
            "DynamicEater: Insufficient token balance to transfer"
        );

        // If transfer, dont vest
        if (vestingDuration != 0) {
            // Curent vested
            uint256 vestedAmount = vestings[from].amount;
            vestings[from] = Vesting({
                amount: weweToTransfer + vestedAmount,
                end: block.timestamp + vestingDuration * 1 minutes
            });

            // 10^18
            _totalVested += weweToTransfer;
        } else {
            // Transfer Wewe tokens to sender in 10^18
            IERC20(wewe).transfer(from, weweToTransfer);
        }

        emit Merged(amount, from, weweToTransfer);

        return weweToTransfer;
    }

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external nonReentrant whenNotPaused {
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        require(balance >= amount, "DynamicEater: Insufficient balance to eat");

        // Transfer the tokens to this contract in native decimals
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        _merge(amount, msg.sender);

        // Approve the AMM to use the tokens now in this contract
        IERC20(token).approve(address(amm), amount);

        // Sell the tokens, can fund the contract with the token
        address recipient = treasury == address(0) ? address(this) : treasury;
        amm.sell(amount, token, recipient, extraData);
    }

    function merge(uint256 amount) external virtual whenNotPaused returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        require(balance >= amount, "DynamicEater: Insufficient balance to eat");

        // Transfer the tokens to this contract in native decimals
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        // Check coins decimals.  Assume the input is in the same decimals as the token
        uint256 decimals = IERC20Metadata(token).decimals();
        if (decimals < 18) {
            amount = amount * (10 ** (18 - decimals));
        }

        return _merge(amount, msg.sender);
    }

    function mergeAll() external virtual whenNotPaused returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        IERC20(token).transferFrom(msg.sender, address(this), balance);

        // Check coins decimals
        uint256 decimals = IERC20Metadata(token).decimals();
        if (decimals < 18) {
            balance = balance * (10 ** (18 - decimals));
        }

        return _merge(balance, msg.sender);
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

    function sweep() external onlyOwner {
        uint256 balance = IERC20(wewe).balanceOf(address(this));
        require(balance > 0, "DynamicEater: No balance to sweep");
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
        require(token != address(0), "DynamicEater: Token address not set");

        // Transfer the tokens to this contract in native decimals
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        // Eat the underlying token "token" with the amount of "amount"
        _merge(amount, from);
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

    modifier onlyWhiteListed(address account) {
        require(!paused(), "DynamicEater: Contract is paused");
        _;
    }

    modifier whenClaimable(address account) {
        // Set to 0 to disable vesting
        if (vestingDuration == 0) {
            _;
        }

        require(vestings[account].end <= block.timestamp, "DynamicEater: Vesting not ended");
        _;
    }

    modifier whenSolvent(uint256 amountToMerge) {
        uint256 newAmountToVest = 0;
        require(
            IERC20(wewe).balanceOf(address(this)) >= _totalVested + newAmountToVest,
            "DynamicEater: Insufficient Wewe balance"
        );
        _;
    }

    event Merged(uint256 amount, address indexed account, uint256 weweAmount);
    event RateChanged(uint256 newRate);
}
