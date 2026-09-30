// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEntropyCallbackTarget {
    function _entropyCallback(uint64 sequence, address provider, bytes32 randomNumber) external;
}

contract MockEntropy {
    uint64 public nextSequence = 1;
    mapping(uint64 => address) public consumers;

    function getFeeV2(uint32) external pure returns (uint128) {
        return 1;
    }

    function requestV2(uint32) external payable returns (uint64 sequence) {
        require(msg.value == 1, "fee");
        sequence = nextSequence++;
        consumers[sequence] = msg.sender;
    }

    function fulfill(uint64 sequence, bytes32 randomNumber) external {
        IEntropyCallbackTarget(consumers[sequence])._entropyCallback(sequence, address(this), randomNumber);
    }
}
