// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVRFWrapper} from "../interfaces/IVRFWrapper.sol";

contract MockRandomnessConsumer {
    IVRFWrapper public immutable wrapper;
    uint256 public lastRequestId;
    uint256[] public words;

    constructor(address wrapperAddress) {
        wrapper = IVRFWrapper(wrapperAddress);
    }

    function request(uint256 epochId) external payable {
        lastRequestId = wrapper.requestRandomWords{value: msg.value}(epochId);
    }

    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        require(msg.sender == address(wrapper), "wrapper");
        require(requestId == lastRequestId, "request");
        words = randomWords;
    }

    function word(uint256 index) external view returns (uint256) {
        return words[index];
    }
}
