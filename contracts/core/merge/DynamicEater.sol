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
        return calculateTokensOut(1);
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

        // Initial virtual balances
        virtualFOMO = _virtualFOMO;
        virtualWEWE = _virtualWEWE;
    }

    function setWhiteList(address account) external onlyOwner {
        whiteList[account] = true;
    }

    function setVitualBalance(uint256 _maxSupply) external onlyOwner {
        maxSupply = _maxSupply;
    }

    function calculateTokensOut(uint256 x) public view returns (uint256) {
        // Let X be the virtual balance of FOMO.  Leave for readibility
        uint256 X = virtualFOMO;
        uint256 newFOMOBalance = X + x;

        // Let Y be the virtual balance of WEWE. Leave for readibility
        uint256 Y = virtualWEWE;
        Y = _getWeweBalance();

        // y = (x*Y) / (x+X)
        uint256 y = (x * Y) / newFOMOBalance;

        return y;
    }

    function _merge(uint256 amount, address token, address from) internal returns (uint256) {
        // x = amount
        uint256 weweToTransfer = calculateTokensOut(amount);

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
            vestings[from] = Vesting({
                amount: weweToTransfer + vestedAmount,
                end: block.timestamp + vestingDuration * 1 minutes
            });

            _totalVested += weweToTransfer;
        } else {
            // Transfer Wewe tokens to sender
            IERC20(wewe).transfer(from, weweToTransfer);
        }

        emit Merged(amount, from, weweToTransfer);

        return weweToTransfer;
    }

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external nonReentrant whenNotPaused {
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        require(balance >= amount, "DynamicEater: Insufficient balance to eat");

        _merge(amount, token, msg.sender);

        // Approve the AMM to use the tokens now in this contract
        IERC20(token).approve(address(amm), amount);

        // Sell the tokens, can fund the contract with the token
        address recipient = treasury == address(0) ? address(this) : treasury;
        amm.sell(amount, token, recipient, extraData);
    }

    function merge(uint256 amount) external virtual whenNotPaused returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        require(balance >= amount, "DynamicEater: Insufficient balance to eat");

        return _merge(amount, token, msg.sender);
    }

    function mergeAll() external virtual whenNotPaused returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        return _merge(balance, token, msg.sender);
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

        // Eat the underlying token "token" with the amount of "amount"
        _merge(amount, token, from);
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
