import { Contract, JsonRpcProvider, Wallet } from "ethers";

const ABI = [
  "function setRoot(uint256 epochId, bytes32 merkleRoot, uint256 eligibleCount, string snapshotUri)",
  "function getRoot(uint256 epochId) view returns (bytes32,uint256,string)",
];

export async function publishEligibilityRoot(
  epochId: bigint,
  merkleRoot: string,
  eligibleCount: number,
  snapshotUri: string,
): Promise<string> {
  const privateKey = process.env.REGISTRY_PUBLISHER_PRIVATE_KEY;
  const address = process.env.ELIGIBILITY_REGISTRY_ADDRESS;
  if (!privateKey || !address) throw new Error("Registry deployment credentials are not configured");
  const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz");
  const contract = new Contract(address, ABI, new Wallet(privateKey, provider));
  const transaction = await contract.setRoot(epochId, merkleRoot, eligibleCount, snapshotUri);
  const receipt = await transaction.wait();
  if (!receipt) throw new Error("Root publication was not confirmed");
  return receipt.hash;
}

export async function readEligibilityRoot(epochId: bigint): Promise<{ root: string; count: number }> {
  const address = process.env.ELIGIBILITY_REGISTRY_ADDRESS;
  if (!address) throw new Error("ELIGIBILITY_REGISTRY_ADDRESS is not configured");
  const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz");
  const contract = new Contract(address, ABI, provider);
  const [root, count] = await contract.getRoot(epochId);
  return { root, count: Number(count) };
}
