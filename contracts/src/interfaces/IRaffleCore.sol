// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRaffleCore {
    function fundEpoch(uint256 epochId, address token, uint256 amount) external payable;
    function requestDraw(uint256 epochId) external payable;
    function claim(uint256 epochId, uint256 index, bytes32[] calldata merkleProof) external;
    function pause() external;
    function unpause() external;
}
