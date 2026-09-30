import { ethers } from "hardhat";

async function main() {
  const network = await ethers.provider.getNetwork();
  if (process.env.CONFIRM_ENTROPY_SMOKE_CHAIN_ID !== network.chainId.toString()) {
    throw new Error(`Set CONFIRM_ENTROPY_SMOKE_CHAIN_ID=${network.chainId} to authorize the smoke transaction`);
  }
  const entropyAddress = process.env.PYTH_ENTROPY_ADDRESS;
  if (!entropyAddress || !ethers.isAddress(entropyAddress)) throw new Error("PYTH_ENTROPY_ADDRESS is required");
  if ((await ethers.provider.getCode(entropyAddress)) === "0x") throw new Error("Entropy address has no bytecode");

  const [signer] = await ethers.getSigners();
  const smoke = await ethers.deployContract("PythEntropySmoke", [entropyAddress, signer.address]);
  await smoke.waitForDeployment();
  const fee = await smoke.requestFee();
  const transaction = await smoke.request({ value: fee });
  const receipt = await transaction.wait();

  console.log(JSON.stringify({
    chainId: network.chainId.toString(),
    smokeContract: await smoke.getAddress(),
    feeWei: fee.toString(),
    requestTransaction: receipt?.hash,
    sequence: (await smoke.lastSequence()).toString(),
    callbackPending: (await smoke.lastRandomNumber()) === ethers.ZeroHash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
