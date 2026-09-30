// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEligibilityRegistry {
    function setPublisher(address publisherAddress) external;

    function setRoot(uint256 epochId, bytes32 merkleRoot, uint256 eligibleCount, string calldata snapshotUri) external;

    function getRoot(uint256 epochId)
        external
        view
        returns (bytes32 merkleRoot, uint256 eligibleCount, string memory snapshotUri);

    function verifyProof(uint256 epochId, uint256 index, address wallet, bytes32[] calldata proof)
        external
        view
        returns (bool);
}
