// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IEligibilityRegistry} from "./interfaces/IEligibilityRegistry.sol";

contract EligibilityRegistry is IEligibilityRegistry, Ownable {
    struct RootInfo {
        bytes32 merkleRoot;
        uint256 eligibleCount;
        string snapshotUri;
    }

    mapping(uint256 => RootInfo) private roots;
    address public publisher;

    error InvalidRoot();
    error InvalidEligibleCount();
    error RootAlreadySet();
    error InvalidPublisher();
    error NotPublisher();

    event RootSet(uint256 indexed epochId, bytes32 indexed merkleRoot, uint256 eligibleCount, string snapshotUri);
    event PublisherSet(address indexed publisher);

    constructor(address initialOwner) Ownable(initialOwner) {
        publisher = initialOwner;
        emit PublisherSet(initialOwner);
    }

    function setPublisher(address publisherAddress) external onlyOwner {
        if (publisherAddress == address(0)) revert InvalidPublisher();
        publisher = publisherAddress;
        emit PublisherSet(publisherAddress);
    }

    function setRoot(uint256 epochId, bytes32 merkleRoot, uint256 eligibleCount, string calldata snapshotUri)
        external
    {
        if (msg.sender != publisher) revert NotPublisher();
        if (merkleRoot == bytes32(0)) revert InvalidRoot();
        if (eligibleCount < 3) revert InvalidEligibleCount();
        if (roots[epochId].merkleRoot != bytes32(0)) revert RootAlreadySet();

        roots[epochId] = RootInfo(merkleRoot, eligibleCount, snapshotUri);
        emit RootSet(epochId, merkleRoot, eligibleCount, snapshotUri);
    }

    function getRoot(uint256 epochId)
        external
        view
        returns (bytes32 merkleRoot, uint256 eligibleCount, string memory snapshotUri)
    {
        RootInfo storage root = roots[epochId];
        return (root.merkleRoot, root.eligibleCount, root.snapshotUri);
    }

    function verifyProof(uint256 epochId, uint256 index, address wallet, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        RootInfo storage root = roots[epochId];
        if (root.merkleRoot == bytes32(0) || index >= root.eligibleCount) return false;
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(epochId, index, wallet))));
        return MerkleProof.verifyCalldata(proof, root.merkleRoot, leaf);
    }
}
