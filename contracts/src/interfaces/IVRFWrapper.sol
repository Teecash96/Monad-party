// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVRFWrapper {
    function requestRandomWords(uint256 epochId) external payable returns (uint256 requestId);
    function getRequestFee() external view returns (uint256);
    function getRequestEpoch(uint256 requestId) external view returns (uint256);
}

interface IRandomnessConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}
