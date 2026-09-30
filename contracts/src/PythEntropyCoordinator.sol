// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEntropyConsumer} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

interface IRandomnessReceiver {
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

contract PythEntropyCoordinator is IEntropyConsumer, Ownable {
    uint32 public constant CALLBACK_GAS_LIMIT = 650_000;

    IEntropyV2 public immutable entropy;
    address public requester;
    mapping(uint256 => bytes32) public pendingRandomness;
    mapping(uint256 => bool) public delivered;

    error FeeMismatch();
    error InvalidEntropyAddress();
    error InvalidWordCount();
    error NotRequester();
    error RequesterAlreadySet();
    error UnknownRandomness();

    event RequesterSet(address indexed requester);
    event EntropyRequested(uint256 indexed requestId);
    event RandomnessDelivered(uint256 indexed requestId);
    event RandomnessDeliveryFailed(uint256 indexed requestId, bytes reason);

    constructor(address entropyAddress, address initialOwner) Ownable(initialOwner) {
        if (entropyAddress == address(0)) revert InvalidEntropyAddress();
        entropy = IEntropyV2(entropyAddress);
    }

    function setRequester(address requesterAddress) external onlyOwner {
        if (requester != address(0)) revert RequesterAlreadySet();
        if (requesterAddress.code.length == 0) revert NotRequester();
        requester = requesterAddress;
        emit RequesterSet(requesterAddress);
    }

    function requestFee() external view returns (uint256) {
        return entropy.getFeeV2(CALLBACK_GAS_LIMIT);
    }

    function requestRandomWords(uint32 numWords) external payable returns (uint256 requestId) {
        if (msg.sender != requester) revert NotRequester();
        if (numWords != 3) revert InvalidWordCount();
        uint256 fee = entropy.getFeeV2(CALLBACK_GAS_LIMIT);
        if (msg.value != fee) revert FeeMismatch();
        requestId = entropy.requestV2{value: fee}(CALLBACK_GAS_LIMIT);
        emit EntropyRequested(requestId);
    }

    function retryDelivery(uint256 requestId) external {
        bytes32 randomNumber = pendingRandomness[requestId];
        if (randomNumber == bytes32(0) || delivered[requestId]) revert UnknownRandomness();
        _deliver(requestId, randomNumber);
    }

    function entropyCallback(uint64 sequence, address, bytes32 randomNumber) internal override {
        pendingRandomness[sequence] = randomNumber;
        _deliver(sequence, randomNumber);
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    function _deliver(uint256 requestId, bytes32 randomNumber) private {
        uint256[] memory words = new uint256[](3);
        words[0] = uint256(randomNumber);
        words[1] = uint256(keccak256(abi.encode(randomNumber, uint256(1))));
        words[2] = uint256(keccak256(abi.encode(randomNumber, uint256(2))));

        (bool success, bytes memory reason) = requester.call(
            abi.encodeCall(IRandomnessReceiver.fulfillRandomWords, (requestId, words))
        );
        if (success) {
            delivered[requestId] = true;
            emit RandomnessDelivered(requestId);
        } else {
            emit RandomnessDeliveryFailed(requestId, reason);
        }
    }
}
