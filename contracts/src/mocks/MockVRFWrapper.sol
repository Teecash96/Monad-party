// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVRFWrapper, IRandomnessConsumer} from "../interfaces/IVRFWrapper.sol";

contract MockVRFWrapper is IVRFWrapper {
    address public consumer;
    uint256 public nextRequestId = 1;
    mapping(uint256 => uint256) private requestEpoch;

    function setConsumer(address value) external {
        consumer = value;
    }

    function getRequestFee() external pure returns (uint256) {
        return 0;
    }

    function requestRandomWords(uint256 epochId) external payable returns (uint256 requestId) {
        require(msg.sender == consumer, "not consumer");
        requestId = nextRequestId++;
        requestEpoch[requestId] = epochId;
    }

    function getRequestEpoch(uint256 requestId) external view returns (uint256) {
        return requestEpoch[requestId];
    }

    function fulfill(uint256 requestId, uint256[] calldata randomWords) external {
        IRandomnessConsumer(consumer).rawFulfillRandomWords(requestId, randomWords);
    }
}
