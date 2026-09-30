import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

describe("RaffleCore", function () {
  async function fixture() {
    const [owner, walletA, walletB, walletC, walletD, outsider] = await ethers.getSigners();
    const registry = await ethers.deployContract("EligibilityRegistry", [owner.address]);
    const random = await ethers.deployContract("MockVRFWrapper");
    const raffle = await ethers.deployContract("RaffleCore", [
      await registry.getAddress(),
      await random.getAddress(),
      owner.address,
    ]);
    await random.setConsumer(await raffle.getAddress());

    const epochId = await raffle.currentEpochId();
    const wallets = [walletA, walletB, walletC, walletD];
    const values = wallets.map((wallet, index) => [epochId, BigInt(index), wallet.address]);
    const tree = StandardMerkleTree.of(values, ["uint256", "uint256", "address"]);
    await registry.setRoot(epochId, tree.root, values.length, "ipfs://epoch-40");
    return { owner, wallets, outsider, registry, random, raffle, tree, epochId };
  }

  async function fundedAndDrawn() {
    const state = await fixture();
    const amount = ethers.parseEther("10");
    await state.raffle.fundEpoch(state.epochId, ethers.ZeroAddress, amount, { value: amount });
    const start = await state.raffle.epochStart(state.epochId);
    await time.setNextBlockTimestamp(start + 7n * 24n * 60n * 60n + 5n * 60n);
    await state.raffle.requestDraw(state.epochId);
    await state.random.fulfill(1n, [11n, 22n, 33n]);
    return { ...state, amount };
  }

  it("funds an epoch and rejects duplicate funding", async function () {
    const { raffle, epochId } = await fixture();
    const amount = ethers.parseEther("10");
    await expect(raffle.fundEpoch(epochId, ethers.ZeroAddress, amount, { value: amount }))
      .to.emit(raffle, "EpochFunded");
    await expect(raffle.fundEpoch(epochId, ethers.ZeroAddress, amount, { value: amount }))
      .to.be.revertedWithCustomError(raffle, "AlreadyFunded");
  });

  it("rejects ERC20 funding in the native MON MVP", async function () {
    const { raffle, epochId, owner } = await fixture();
    await expect(raffle.fundEpoch(epochId, owner.address, 1n))
      .to.be.revertedWithCustomError(raffle, "TokenNotSupported");
  });

  it("draws three distinct winner indexes with a 50 30 20 split", async function () {
    const { raffle, epochId, amount } = await fundedAndDrawn();
    const indexes = [];
    const expected = [amount / 2n, amount * 3n / 10n, amount / 5n];
    for (let rank = 0; rank < 3; rank++) {
      const winner = await raffle.winners(epochId, rank);
      indexes.push(winner.index);
      expect(winner.amount).to.equal(expected[rank]);
    }
    expect(new Set(indexes.map(String)).size).to.equal(3);
  });

  it("allows only the wallet bound to the selected index and proof to claim", async function () {
    const { raffle, epochId, wallets, outsider, tree } = await fundedAndDrawn();
    const winner = await raffle.winners(epochId, 0);
    const index = Number(winner.index);
    await expect(
      raffle.connect(outsider).claim(epochId, winner.index, tree.getProof(index)),
    ).to.be.revertedWithCustomError(raffle, "InvalidProof");

    await expect(raffle.connect(wallets[index]).claim(epochId, winner.index, tree.getProof(index)))
      .to.emit(raffle, "PrizeClaimed")
      .withArgs(epochId, wallets[index].address, 0, winner.amount);

    await expect(raffle.connect(wallets[index]).claim(epochId, winner.index, tree.getProof(index)))
      .to.be.revertedWithCustomError(raffle, "PrizeAlreadyClaimed");
  });

  it("rejects callbacks that do not come from the wrapper", async function () {
    const { raffle } = await fixture();
    await expect(raffle.rawFulfillRandomWords(1n, [1n]))
      .to.be.revertedWithCustomError(raffle, "NotRandomnessWrapper");
  });

  it("rejects rollover into the same or an earlier epoch", async function () {
    const { raffle, epochId } = await fundedAndDrawn();
    await time.increase(30n * 24n * 60n * 60n + 1n);
    await expect(raffle.rolloverUnclaimed(epochId, epochId))
      .to.be.revertedWithCustomError(raffle, "InvalidRolloverTarget");
  });

  it("pauses draw and claim operations", async function () {
    const { raffle, epochId } = await fixture();
    await raffle.fundEpoch(epochId, ethers.ZeroAddress, 1n, { value: 1n });
    await raffle.pause();
    await expect(raffle.requestDraw(epochId)).to.be.revertedWithCustomError(raffle, "EnforcedPause");
  });
});
