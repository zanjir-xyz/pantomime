// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract Game is Ownable {
    constructor(address _owner) Ownable(_owner) {}

    bool public ended;
    mapping(address => bool) public isPlayer;
    mapping(address => uint256) public playerProgress;
    mapping(address => uint256) public playerScore;
    uint256 public totalScores;
    mapping(uint256 => mapping(address => bool)) public levelSolution;
    mapping(uint256 => uint256) public levelCorrects;
    mapping(bytes32 => bool) consumedSigs;
    mapping(address => bool) public isPlayerReleased;

    function end() external onlyOwner {
        require(!ended, "Game has ended!");
        ended = true;
    }

    function allowAnswer(uint256 level, address answer) external onlyOwner {
        levelSolution[level][answer] = true;
    }

    function disallowAnswer(uint256 level, address answer) external onlyOwner {
        levelSolution[level][answer] = false;
    }

    function signup() external payable {
        require(!ended, "Game has ended!");
        require(msg.value == 0.001 ether);
        require(!isPlayer[msg.sender], "Already signed up!");
        isPlayer[msg.sender] = true;
    }

    function release() external {
        require(ended, "Game has not yet ended!");
        require(!isPlayerReleased[msg.sender], "Player already released!");
        uint256 totalBalance = address(this).balance;
        uint256 won = totalBalance * playerScore[msg.sender] / totalScores;
        (bool success,) = msg.sender.call{value: won}("");
        require(success, "Transfer failed!");
    }

    function submit(uint8 v, bytes32 r, bytes32 s) external {
        require(!ended, "Game has ended!");
        require(!consumedSigs[r], "Signature already consumed!");
        require(isPlayer[msg.sender], "User has not signed up!");
        uint256 level = playerProgress[msg.sender];
        address submission = ecrecover(bytes32(uint256(level)), v, r, s);
        require(levelSolution[level][submission], "Incorrect answer!");
        consumedSigs[r] = true;
        playerProgress[msg.sender] += 1;
        uint256 score = 1 ether >> levelCorrects[level];
        playerScore[msg.sender] += score;
        totalScores += score;
        levelCorrects[level] += 1;
    }
}
