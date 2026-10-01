import { ethers } from "hardhat";

const GAME_ABI = [
  "function owner() view returns (address)",
  "function currentDay() view returns (uint64)",
  "function challengeHash(uint64) view returns (bytes32)",
  "function makeAnswerHash(bytes32 answer, bytes32 salt) pure returns (bytes32)",
  "function setDailyChallenge(uint64 utcDay, bytes32 answerHash)",
];

function toBytes32(value: string, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  if (ethers.isHexString(value, 32)) return value;
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const confirmation = process.env.CONFIRM_PARTY_CHALLENGE_CHAIN_ID;
  if (confirmation !== network.chainId.toString()) {
    throw new Error(`Set CONFIRM_PARTY_CHALLENGE_CHAIN_ID=${network.chainId} to authorize this transaction`);
  }

  const gameAddress = process.env.PARTY_GAME_ADDRESS;
  if (!gameAddress || !ethers.isAddress(gameAddress)) {
    throw new Error("PARTY_GAME_ADDRESS must be a valid MonadPartyGame address");
  }

  const [signer] = await ethers.getSigners();
  const game = new ethers.Contract(gameAddress, GAME_ABI, signer);
  const [owner, currentDay] = await Promise.all([
    game.owner() as Promise<string>,
    game.currentDay() as Promise<bigint>,
  ]);
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer ${signer.address} is not the game owner ${owner}`);
  }

  const requestedDay = process.env.PARTY_CHALLENGE_DAY
    ? BigInt(process.env.PARTY_CHALLENGE_DAY)
    : currentDay;
  if (requestedDay < currentDay) {
    throw new Error(`PARTY_CHALLENGE_DAY ${requestedDay} is before current UTC day ${currentDay}`);
  }

  const existing = await game.challengeHash(requestedDay) as string;
  if (existing !== ethers.ZeroHash) {
    throw new Error(`A challenge is already published for UTC day ${requestedDay}`);
  }

  const answer = toBytes32(process.env.PARTY_CHALLENGE_ANSWER || "", "PARTY_CHALLENGE_ANSWER");
  const salt = toBytes32(process.env.PARTY_CHALLENGE_SALT || "", "PARTY_CHALLENGE_SALT");
  const answerHash = await game.makeAnswerHash(answer, salt) as string;

  console.log(JSON.stringify({
    chainId: network.chainId.toString(),
    gameAddress,
    utcDay: requestedDay.toString(),
    answerHash,
    signer: signer.address,
  }, null, 2));

  const transaction = await game.setDailyChallenge(requestedDay, answerHash);
  console.log(`transaction: ${transaction.hash}`);
  const receipt = await transaction.wait();
  console.log(`confirmed in block ${receipt.blockNumber}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
