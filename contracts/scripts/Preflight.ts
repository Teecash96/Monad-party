import { ethers } from "hardhat";

const CALLBACK_GAS_LIMIT = 650_000;

async function main() {
  const network = await ethers.provider.getNetwork();
  const expected = BigInt(process.env.EXPECTED_CHAIN_ID || network.chainId.toString());
  if (network.chainId !== expected) {
    throw new Error(`Wrong network: expected ${expected}, received ${network.chainId}`);
  }

  const entropyAddress = process.env.PYTH_ENTROPY_ADDRESS;
  if (!entropyAddress || !ethers.isAddress(entropyAddress) || entropyAddress === ethers.ZeroAddress) {
    throw new Error("Set PYTH_ENTROPY_ADDRESS to the verified address for this network");
  }
  const bytecode = await ethers.provider.getCode(entropyAddress);
  if (bytecode === "0x") throw new Error("The Entropy address has no bytecode on this network");

  const entropy = new ethers.Contract(
    entropyAddress,
    [
      "function getFeeV2(uint32 gasLimit) view returns (uint128)",
      "function getDefaultProvider() view returns (address)",
    ],
    ethers.provider,
  );
  const [fee, provider, blockNumber] = await Promise.all([
    entropy.getFeeV2(CALLBACK_GAS_LIMIT) as Promise<bigint>,
    entropy.getDefaultProvider() as Promise<string>,
    ethers.provider.getBlockNumber(),
  ]);
  if (provider === ethers.ZeroAddress) throw new Error("Entropy returned a zero default provider");

  console.log(JSON.stringify({
    status: "ready",
    chainId: network.chainId.toString(),
    blockNumber,
    entropyAddress,
    defaultProvider: provider,
    callbackGasLimit: CALLBACK_GAS_LIMIT,
    feeWei: fee.toString(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
