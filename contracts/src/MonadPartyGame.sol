// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Minimal first party game used by Monad Party's passport adapter.
/// The owner publishes a daily answer commitment. A player reveals the answer
/// and salt once that day to earn the single milestone stamp.
contract MonadPartyGame is Ownable, Pausable {
    uint256 public constant MILESTONE = 1;

    mapping(uint64 => bytes32) public challengeHash;
    mapping(address => mapping(uint64 => bool)) public completed;

    error ChallengeNotSet();
    error ChallengeAlreadySet();
    error InvalidChallengeDay();
    error InvalidChallengeHash();
    error WrongDay();
    error WrongAnswer();
    error AlreadyCompleted();

    event DailyChallengeSet(uint64 indexed utcDay, bytes32 indexed answerHash);
    event MilestoneCompleted(address indexed player, uint256 milestone);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function currentDay() public view returns (uint64) {
        return uint64(block.timestamp / 1 days);
    }

    function makeAnswerHash(bytes32 answer, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(answer, salt));
    }

    function setDailyChallenge(uint64 utcDay, bytes32 answerHash) external onlyOwner {
        if (utcDay < currentDay()) revert InvalidChallengeDay();
        if (answerHash == bytes32(0)) revert InvalidChallengeHash();
        if (challengeHash[utcDay] != bytes32(0)) revert ChallengeAlreadySet();
        challengeHash[utcDay] = answerHash;
        emit DailyChallengeSet(utcDay, answerHash);
    }

    function play(uint64 utcDay, bytes32 answer, bytes32 salt) external whenNotPaused {
        if (utcDay != currentDay()) revert WrongDay();
        bytes32 expected = challengeHash[utcDay];
        if (expected == bytes32(0)) revert ChallengeNotSet();
        if (completed[msg.sender][utcDay]) revert AlreadyCompleted();
        if (makeAnswerHash(answer, salt) != expected) revert WrongAnswer();
        completed[msg.sender][utcDay] = true;
        emit MilestoneCompleted(msg.sender, MILESTONE);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
