// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEntropyConsumer} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

contract PythEntropySmoke is IEntropyConsumer, Ownable {
    uint32 public constant CALLBACK_GAS_LIMIT = 120_000;

    IEntropyV2 public immutable entropy;
    uint64 public lastSequence;
    bytes32 public lastRandomNumber;

    error FeeMismatch();
    error InvalidEntropyAddress();

    event RandomnessRequested(uint64 indexed sequence, uint256 fee);
    event RandomnessReceived(uint64 indexed sequence, address indexed provider, bytes32 randomNumber);

    constructor(address entropyAddress, address initialOwner) Ownable(initialOwner) {
        if (entropyAddress == address(0)) revert InvalidEntropyAddress();
        entropy = IEntropyV2(entropyAddress);
    }

    function requestFee() external view returns (uint256) {
        return entropy.getFeeV2(CALLBACK_GAS_LIMIT);
    }

    function request() external payable onlyOwner returns (uint64 sequence) {
        uint256 fee = entropy.getFeeV2(CALLBACK_GAS_LIMIT);
        if (msg.value != fee) revert FeeMismatch();
        sequence = entropy.requestV2{value: fee}(CALLBACK_GAS_LIMIT);
        lastSequence = sequence;
        emit RandomnessRequested(sequence, fee);
    }

    function entropyCallback(uint64 sequence, address provider, bytes32 randomNumber) internal override {
        lastSequence = sequence;
        lastRandomNumber = randomNumber;
        emit RandomnessReceived(sequence, provider, randomNumber);
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
}
