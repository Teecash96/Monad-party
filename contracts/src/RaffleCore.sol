// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IEligibilityRegistry} from "./interfaces/IEligibilityRegistry.sol";
import {IVRFWrapper} from "./interfaces/IVRFWrapper.sol";
import {IRaffleCore} from "./interfaces/IRaffleCore.sol";

contract RaffleCore is IRaffleCore, Ownable, Pausable, ReentrancyGuard {
    enum DrawState {
        None,
        Requested,
        Fulfilled
    }

    struct EpochInfo {
        uint64 startTime;
        uint64 endTime;
        uint64 claimDeadline;
        address token;
        uint256 prizePool;
        uint256 requestId;
        uint256 eligibleCount;
        DrawState drawState;
        bool funded;
        bool rolledOver;
    }

    struct WinnerInfo {
        uint256 index;
        uint256 amount;
        bool claimed;
    }

    uint256 public constant EPOCH_DURATION = 7 days;
    uint256 public constant MONDAY_OFFSET = 4 days;
    uint256 public constant DRAW_DELAY = 5 minutes;
    uint256 public constant CLAIM_WINDOW = 30 days;

    IEligibilityRegistry public immutable eligibilityRegistry;
    IVRFWrapper public immutable vrfWrapper;

    mapping(uint256 => EpochInfo) public epochs;
    mapping(uint256 => mapping(uint8 => WinnerInfo)) public winners;
    mapping(uint256 => mapping(address => bool)) public walletClaimed;

    error AlreadyFunded();
    error AlreadyRolledOver();
    error ClaimExpired();
    error ClaimNotExpired();
    error DrawNotFulfilled();
    error DrawNotReady();
    error DrawAlreadyRequested();
    error EpochNotFunded();
    error InvalidAmount();
    error InvalidProof();
    error InvalidRandomness();
    error InvalidRequest();
    error InvalidWinnerIndex();
    error NativeValueMismatch();
    error NotEnoughEligibleWallets();
    error NotRandomnessWrapper();
    error PrizeAlreadyClaimed();
    error TokenNotSupported();
    error TransferFailed();
    error InvalidRolloverTarget();

    event EpochFunded(uint256 indexed epochId, address indexed token, uint256 amount);
    event DrawRequested(uint256 indexed epochId, uint256 indexed requestId);
    event DrawFulfilled(uint256 indexed epochId, uint256[3] winnerIndexes, uint256[3] amounts);
    event PrizeClaimed(uint256 indexed epochId, address indexed wallet, uint8 rank, uint256 amount);
    event EpochRolledOver(uint256 indexed epochId, uint256 indexed nextEpochId, uint256 amount);

    constructor(address registry, address randomnessWrapper, address initialOwner) Ownable(initialOwner) {
        eligibilityRegistry = IEligibilityRegistry(registry);
        vrfWrapper = IVRFWrapper(randomnessWrapper);
    }

    function currentEpochId() public view returns (uint256) {
        return epochIdAt(block.timestamp);
    }

    function epochIdAt(uint256 timestamp) public pure returns (uint256) {
        if (timestamp < MONDAY_OFFSET) return 0;
        return (timestamp - MONDAY_OFFSET) / EPOCH_DURATION;
    }

    function epochStart(uint256 epochId) public pure returns (uint256) {
        return MONDAY_OFFSET + epochId * EPOCH_DURATION;
    }

    function fundEpoch(uint256 epochId, address token, uint256 amount) external payable onlyOwner {
        EpochInfo storage epoch = epochs[epochId];
        if (epoch.funded) revert AlreadyFunded();
        if (amount == 0) revert InvalidAmount();

        if (token != address(0)) revert TokenNotSupported();
        if (msg.value != amount) revert NativeValueMismatch();

        epoch.startTime = uint64(epochStart(epochId));
        epoch.endTime = uint64(epoch.startTime + EPOCH_DURATION);
        epoch.token = token;
        epoch.prizePool = amount;
        epoch.funded = true;
        emit EpochFunded(epochId, token, amount);
    }

    function requestDraw(uint256 epochId) external payable onlyOwner whenNotPaused {
        EpochInfo storage epoch = epochs[epochId];
        if (!epoch.funded) revert EpochNotFunded();
        if (epoch.drawState != DrawState.None) revert DrawAlreadyRequested();
        if (block.timestamp < uint256(epoch.endTime) + DRAW_DELAY) revert DrawNotReady();

        (, uint256 eligibleCount,) = eligibilityRegistry.getRoot(epochId);
        if (eligibleCount < 3) revert NotEnoughEligibleWallets();
        uint256 fee = vrfWrapper.getRequestFee();
        if (msg.value != fee) revert NativeValueMismatch();

        epoch.eligibleCount = eligibleCount;
        epoch.drawState = DrawState.Requested;
        epoch.requestId = vrfWrapper.requestRandomWords{value: fee}(epochId);
        emit DrawRequested(epochId, epoch.requestId);
    }

    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != address(vrfWrapper)) revert NotRandomnessWrapper();
        uint256 epochId = vrfWrapper.getRequestEpoch(requestId);
        EpochInfo storage epoch = epochs[epochId];
        if (epoch.drawState != DrawState.Requested || epoch.requestId != requestId) revert InvalidRequest();
        if (randomWords.length == 0) revert InvalidRandomness();

        uint256[3] memory selected;
        for (uint8 rank = 0; rank < 3; ++rank) {
            uint256 seed = uint256(keccak256(abi.encode(randomWords[rank % randomWords.length], epochId, rank)));
            selected[rank] = _uniqueUniform(seed, epoch.eligibleCount, selected, rank);
        }

        uint256 first = epoch.prizePool * 50 / 100;
        uint256 second = epoch.prizePool * 30 / 100;
        uint256[3] memory amounts = [first, second, epoch.prizePool - first - second];
        for (uint8 rank = 0; rank < 3; ++rank) {
            winners[epochId][rank] = WinnerInfo(selected[rank], amounts[rank], false);
        }

        epoch.drawState = DrawState.Fulfilled;
        epoch.claimDeadline = uint64(block.timestamp + CLAIM_WINDOW);
        emit DrawFulfilled(epochId, selected, amounts);
    }

    function claim(uint256 epochId, uint256 index, bytes32[] calldata merkleProof)
        external
        whenNotPaused
        nonReentrant
    {
        EpochInfo storage epoch = epochs[epochId];
        if (epoch.drawState != DrawState.Fulfilled) revert DrawNotFulfilled();
        if (block.timestamp > epoch.claimDeadline) revert ClaimExpired();
        if (walletClaimed[epochId][msg.sender]) revert PrizeAlreadyClaimed();

        uint8 rank = _winnerRank(epochId, index);
        WinnerInfo storage winner = winners[epochId][rank];
        if (winner.claimed) revert PrizeAlreadyClaimed();
        if (!eligibilityRegistry.verifyProof(epochId, index, msg.sender, merkleProof)) revert InvalidProof();

        winner.claimed = true;
        walletClaimed[epochId][msg.sender] = true;
        _transfer(msg.sender, winner.amount);
        emit PrizeClaimed(epochId, msg.sender, rank, winner.amount);
    }

    function rolloverUnclaimed(uint256 epochId, uint256 nextEpochId) external onlyOwner nonReentrant {
        EpochInfo storage epoch = epochs[epochId];
        if (epoch.drawState != DrawState.Fulfilled) revert DrawNotFulfilled();
        if (block.timestamp <= epoch.claimDeadline) revert ClaimNotExpired();
        if (epoch.rolledOver) revert AlreadyRolledOver();
        if (nextEpochId <= epochId || epochs[nextEpochId].drawState != DrawState.None) {
            revert InvalidRolloverTarget();
        }

        uint256 unclaimed;
        for (uint8 rank = 0; rank < 3; ++rank) {
            WinnerInfo storage winner = winners[epochId][rank];
            if (!winner.claimed) {
                winner.claimed = true;
                unclaimed += winner.amount;
            }
        }
        epoch.rolledOver = true;

        EpochInfo storage next = epochs[nextEpochId];
        if (!next.funded) {
            next.startTime = uint64(epochStart(nextEpochId));
            next.endTime = uint64(next.startTime + EPOCH_DURATION);
            next.token = epoch.token;
            next.funded = true;
        }
        next.prizePool += unclaimed;
        emit EpochRolledOver(epochId, nextEpochId, unclaimed);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _winnerRank(uint256 epochId, uint256 index) private view returns (uint8) {
        for (uint8 rank = 0; rank < 3; ++rank) {
            if (winners[epochId][rank].index == index) return rank;
        }
        revert InvalidWinnerIndex();
    }

    function _uniqueUniform(uint256 seed, uint256 upperBound, uint256[3] memory selected, uint8 used)
        private
        pure
        returns (uint256 value)
    {
        uint256 limit = type(uint256).max - (type(uint256).max % upperBound);
        while (true) {
            if (seed < limit) {
                value = seed % upperBound;
                bool duplicate;
                for (uint8 i = 0; i < used; ++i) duplicate = duplicate || selected[i] == value;
                if (!duplicate) return value;
            }
            seed = uint256(keccak256(abi.encode(seed)));
        }
    }

    function _transfer(address recipient, uint256 amount) private {
        (bool sent,) = payable(recipient).call{value: amount}("");
        if (!sent) revert TransferFailed();
    }
}
