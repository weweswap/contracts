// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IOwnable.sol";
import "../interfaces/IFarm.sol";
import "../interfaces/IApproveAndCall.sol";
import {IWeweReceiver} from "../interfaces/IWeweReceiver.sol";

contract ChaosToken is IERC20, IApproveAndCall, Ownable {
    IFarm private _farm;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    function name() public pure returns (string memory) {
        return "CHAOS";
    }

    function symbol() public pure returns (string memory) {
        return "CHAOS";
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "CHAOS: transfer to the zero address");

        uint256 fromBalance = _balances[msg.sender];
        require(fromBalance >= amount, "CHAOS: transfer amount exceeds balance");
        unchecked {
            _balances[msg.sender] = fromBalance - amount;
            // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
            // decrementing then incrementing.
            _balances[to] += amount;
        }

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        address sender = from;
        require(_balances[sender] >= amount, "CHAOS: transfer amount exceeds balance");
        require(_allowances[sender][msg.sender] >= amount, "CHAOS: transfer amount exceeds allowance");

        _balances[sender] -= amount;
        _balances[to] += amount;
        _allowances[sender][msg.sender] -= amount;
        emit Transfer(sender, to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function setFarm(address farm) external onlyOwner {
        _farm = IFarm(farm);
        uint256 amount = 1_000_000_000 * 1e18;
        _mint(address(_farm), amount);
    }

    function mint(uint256 amount) external onlyOwner {
        _mint(msg.sender, amount);
    }

    function mintToFarm(uint256 amount) external onlyOwner {
        require(address(_farm) != address(0), "ChaosToken: Farm not set");
        _mint(address(_farm), amount);
    }

    function collectEmmisions(uint256 pid) external {
        require(address(_farm) != address(0), "ChaosToken: Farm not set");
        _farm.harvest(pid, msg.sender);
    }

    function approveAndCall(address spender, uint256 amount, bytes calldata extraData) external returns (bool) {
        // Approve the spender to spend the tokens
        _approve(msg.sender, spender, amount);

        // Call the receiveApproval function on the spender contract
        IWeweReceiver(spender).receiveApproval(msg.sender, amount, address(this), extraData);

        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        unchecked {
            // Overflow not possible: balance + amount is at most totalSupply + amount, which is checked above.
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);
    }
}
