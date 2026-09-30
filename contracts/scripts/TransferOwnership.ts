import { ethers } from "hardhat";

const contracts = [
  ["EligibilityRegistry", "ELIGIBILITY_REGISTRY_ADDRESS"],
  ["PythEntropyCoordinator", "PYTH_ENTROPY_COORDINATOR_ADDRESS"],
  ["VRFWrapper", "VRF_WRAPPER_ADDRESS"],
  ["RaffleCore", "RAFFLE_CORE_ADDRESS"],
] as const;

async function main() {
  const network = await ethers.provider.getNetwork();
  const newOwner = process.env.NEW_OWNER;
  if (!newOwner || !ethers.isAddress(newOwner) || newOwner === ethers.ZeroAddress) {
    throw new Error("NEW_OWNER must be a valid nonzero multisig address");
  }
  if (process.env.CONFIRM_TRANSFER_OWNERSHIP !== `${network.chainId}:${newOwner.toLowerCase()}`) {
    throw new Error(`Set CONFIRM_TRANSFER_OWNERSHIP=${network.chainId}:${newOwner.toLowerCase()}`);
  }

  const [signer] = await ethers.getSigners();
  for (const [name, variable] of contracts) {
    const address = process.env[variable];
    if (!address || !ethers.isAddress(address)) throw new Error(`${variable} is required`);
    const contract = new ethers.Contract(
      address,
      ["function owner() view returns (address)", "function transferOwnership(address newOwner)"],
      signer,
    );
    const currentOwner = await contract.owner() as string;
    if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`${name} is not owned by the active signer`);
    }
    if (name === "EligibilityRegistry") {
      const publisher = process.env.PUBLISHER_ADDRESS;
      if (!publisher || !ethers.isAddress(publisher) || publisher === ethers.ZeroAddress) {
        throw new Error("PUBLISHER_ADDRESS must be the limited backend signer before ownership transfer");
      }
      const registry = new ethers.Contract(
        address,
        ["function setPublisher(address publisherAddress)"],
        signer,
      );
      const publisherTransaction = await registry.setPublisher(publisher);
      await publisherTransaction.wait();
      console.log(`${name}: publisher set in ${publisherTransaction.hash}`);
    }
    const transaction = await contract.transferOwnership(newOwner);
    await transaction.wait();
    console.log(`${name}: ${address} transferred in ${transaction.hash}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
