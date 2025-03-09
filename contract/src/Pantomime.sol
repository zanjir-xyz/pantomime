// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./Verifier.sol";

contract Pantomime is Ownable {
    Groth16Verifier verifier;

    constructor() Ownable(msg.sender) {
        verifier = new Groth16Verifier();
    }

    bool public ended;
    mapping(address => bool) public isPlayer;
    mapping(address => uint256) public playerProgress;
    mapping(address => uint256) public playerScore;
    uint256 public totalScores;
    mapping(uint256 => mapping(uint256 => bool)) public levelSolution;
    mapping(uint256 => uint256) public levelCorrects;
    mapping(uint256 => bool) consumedNonces;
    mapping(address => bool) public isPlayerReleased;

    function end() external onlyOwner {
        require(!ended, "Game has ended!");
        ended = true;
    }

    function allowAnswer(uint256 _level, uint256 _ansHash) external onlyOwner {
        levelSolution[_level][_ansHash] = true;
    }

    function disallowAnswer(uint256 _level, uint256 _ansHash) external onlyOwner {
        levelSolution[_level][_ansHash] = false;
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

    function submit(
        uint256 _ansHash,
        uint256 _ansNonce,
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC
    ) external {
        require(!ended, "Game has ended!");
        require(!consumedNonces[_ansNonce], "Signature already consumed!");
        require(isPlayer[msg.sender], "User has not signed up!");
        uint256 level = playerProgress[msg.sender];
        require(levelSolution[level][_ansHash], "Incorrect answer!");
        require(
            verifier.verifyProof(_pA, _pB, _pC, [uint256(uint160(msg.sender)), _ansNonce, _ansHash]), "Invalid proof!"
        );
        consumedNonces[_ansNonce] = true;
        playerProgress[msg.sender] += 1;
        uint256 score = 1 ether >> levelCorrects[level];
        playerScore[msg.sender] += score;
        totalScores += score;
        levelCorrects[level] += 1;
    }
}
