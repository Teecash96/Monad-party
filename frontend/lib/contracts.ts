import { isAddress, parseAbi, zeroAddress, type Address } from "viem";

function configuredAddress(value: string | undefined): Address {
  return value && isAddress(value) ? value : zeroAddress;
}

export const raffleAddress = configuredAddress(process.env.NEXT_PUBLIC_RAFFLE_CORE_ADDRESS);
export const registryAddress = configuredAddress(process.env.NEXT_PUBLIC_ELIGIBILITY_REGISTRY_ADDRESS);
export const contractsConfigured = raffleAddress !== zeroAddress && registryAddress !== zeroAddress;

export const raffleAbi = parseAbi([
  "function owner() view returns (address)",
  "function vrfWrapper() view returns (address)",
  "function currentEpochId() view returns (uint256)",
  "function epochs(uint256) view returns (uint64 startTime,uint64 endTime,uint64 claimDeadline,address token,uint256 prizePool,uint256 requestId,uint256 eligibleCount,uint8 drawState,bool funded,bool rolledOver)",
  "function winners(uint256,uint8) view returns (uint256 index,uint256 amount,bool claimed)",
  "function fundEpoch(uint256 epochId,address token,uint256 amount) payable",
  "function requestDraw(uint256 epochId) payable",
  "function claim(uint256 epochId,uint256 index,bytes32[] merkleProof)",
  "function pause()",
  "function unpause()",
]);

export const randomnessAbi = parseAbi([
  "function getRequestFee() view returns (uint256)",
]);

export const registryAbi = parseAbi([
  "function getRoot(uint256) view returns (bytes32 merkleRoot,uint256 eligibleCount,string snapshotUri)",
]);
