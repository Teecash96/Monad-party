import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const confirmation = process.env.CONFIRM_DEPLOY_CHAIN_ID;
  if (confirmation !== network.chainId.toString()) {
    throw new Error(`Set CONFIRM_DEPLOY_CHAIN_ID=${network.chainId} to authorize this deployment`);
  }

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  const entropyAddress = process.env.PYTH_ENTROPY_ADDRESS;
  if (!entropyAddress || entropyAddress === ethers.ZeroAddress) {
    throw new Error("PYTH_ENTROPY_ADDRESS must be the verified Pyth Entropy address for this network");
  }
  if (!ethers.isAddress(entropyAddress)) throw new Error("PYTH_ENTROPY_ADDRESS is invalid");
  if ((await ethers.provider.getCode(entropyAddress)) === "0x") {
    throw new Error("PYTH_ENTROPY_ADDRESS has no contract bytecode on this network");
  }
  const entropy = new ethers.Contract(
    entropyAddress,
    ["function getFeeV2(uint32 gasLimit) view returns (uint128)"],
    ethers.provider,
  );
  await entropy.getFeeV2(650_000);
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) throw new Error("Deployer has no native MON for deployment gas");

  // 1. Deploy EligibilityRegistry
  console.log("\n1. Deploying EligibilityRegistry...");
  const EligibilityRegistry = await ethers.getContractFactory("EligibilityRegistry");
  const eligibilityRegistry = await EligibilityRegistry.deploy(deployer.address);
  await eligibilityRegistry.waitForDeployment();
  const eligibilityRegistryAddress = await eligibilityRegistry.getAddress();
  console.log("EligibilityRegistry deployed to:", eligibilityRegistryAddress);

  // 2. Deploy the Pyth Entropy adapter
  console.log("\n2. Deploying PythEntropyCoordinator...");
  const PythEntropyCoordinator = await ethers.getContractFactory("PythEntropyCoordinator");
  const entropyCoordinator = await PythEntropyCoordinator.deploy(entropyAddress, deployer.address);
  await entropyCoordinator.waitForDeployment();
  const entropyCoordinatorAddress = await entropyCoordinator.getAddress();
  console.log("PythEntropyCoordinator deployed to:", entropyCoordinatorAddress);

  // 3. Deploy VRFWrapper
  console.log("\n3. Deploying VRFWrapper...");
  const VRFWrapper = await ethers.getContractFactory("VRFWrapper");
  const vrfWrapper = await VRFWrapper.deploy(entropyCoordinatorAddress, deployer.address);
  await vrfWrapper.waitForDeployment();
  const vrfWrapperAddress = await vrfWrapper.getAddress();
  console.log("VRFWrapper deployed to:", vrfWrapperAddress);

  // 4. Deploy RaffleCore
  console.log("\n4. Deploying RaffleCore...");
  const RaffleCore = await ethers.getContractFactory("RaffleCore");
  const raffleCore = await RaffleCore.deploy(
    eligibilityRegistryAddress,
    vrfWrapperAddress,
    deployer.address
  );
  await raffleCore.waitForDeployment();
  const raffleCoreAddress = await raffleCore.getAddress();
  console.log("RaffleCore deployed to:", raffleCoreAddress);
  await (await vrfWrapper.setConsumer(raffleCoreAddress)).wait();
  await (await entropyCoordinator.setRequester(vrfWrapperAddress)).wait();
  console.log("VRFWrapper consumer configured");

  // Save deployment info
  const deployment = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EligibilityRegistry: eligibilityRegistryAddress,
      PythEntropyCoordinator: entropyCoordinatorAddress,
      VRFWrapper: vrfWrapperAddress,
      RaffleCore: raffleCoreAddress,
    },
    randomness: {
      entropy: entropyAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment saved to:", deploymentFile);

  // Print summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("EligibilityRegistry:", eligibilityRegistryAddress);
  console.log("PythEntropyCoordinator:", entropyCoordinatorAddress);
  console.log("VRFWrapper:", vrfWrapperAddress);
  console.log("RaffleCore:", raffleCoreAddress);
  console.log("\nNext steps:");
  console.log("1. Verify the randomness coordinator fee and callback");
  console.log("2. Call RaffleCore.fundEpoch() for first epoch");
  console.log("3. Start backend indexer and aggregator");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
