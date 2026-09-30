// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVRFWrapper, IRandomnessConsumer} from "./interfaces/IVRFWrapper.sol";

interface IRandomnessCoordinator {
    function requestFee() external view returns (uint256);
    function requestRandomWords(uint32 numWords) external payable returns (uint256 requestId);
}

contract VRFWrapper is IVRFWrapper, Ownable {
    IRandomnessCoordinator public immutable coordinator;
    address public consumer;
    mapping(uint256 => uint256) private requestEpoch;
    mapping(uint256 => bool) private requestExists;

    error ConsumerAlreadySet();
    error InvalidConsumer();
    error NotConsumer();
    error NotCoordinator();
    error UnknownRequest();
    error FeeMismatch();

    event ConsumerSet(address indexed consumer);
    event RandomWordsRequested(uint256 indexed requestId, uint256 indexed epochId);
    event RandomWordsFulfilled(uint256 indexed requestId, uint256 indexed epochId);

    constructor(address coordinatorAddress, address initialOwner) Ownable(initialOwner) {
        if (coordinatorAddress == address(0)) revert NotCoordinator();
        coordinator = IRandomnessCoordinator(coordinatorAddress);
    }

    function setConsumer(address consumerAddress) external onlyOwner {
        if (consumer != address(0)) revert ConsumerAlreadySet();
        if (consumerAddress == address(0)) revert InvalidConsumer();
        consumer = consumerAddress;
        emit ConsumerSet(consumerAddress);
    }

    function getRequestFee() external view returns (uint256) {
        return coordinator.requestFee();
    }

    function requestRandomWords(uint256 epochId) external payable returns (uint256 requestId) {
        if (msg.sender != consumer) revert NotConsumer();
        uint256 fee = coordinator.requestFee();
        if (msg.value != fee) revert FeeMismatch();

        requestId = coordinator.requestRandomWords{value: fee}(3);
        requestEpoch[requestId] = epochId;
        requestExists[requestId] = true;
        emit RandomWordsRequested(requestId, epochId);
    }

    function getRequestEpoch(uint256 requestId) external view returns (uint256) {
        if (!requestExists[requestId]) revert UnknownRequest();
        return requestEpoch[requestId];
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != address(coordinator)) revert NotCoordinator();
        if (!requestExists[requestId]) revert UnknownRequest();
        uint256 epochId = requestEpoch[requestId];

        IRandomnessConsumer(consumer).rawFulfillRandomWords(requestId, randomWords);
        emit RandomWordsFulfilled(requestId, epochId);
    }
}
