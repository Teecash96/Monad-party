import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

function answerHash(answer: string, salt: string) {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  return ethers.keccak256(coder.encode(["bytes32", "bytes32"], [ethers.id(answer), ethers.id(salt)]));
}

describe("MonadPartyGame", function () {
  it("sets a daily challenge and emits one milestone for a correct reveal", async function () {
    const [owner, player] = await ethers.getSigners();
    const game = await ethers.deployContract("MonadPartyGame", [owner.address]);
    const day = BigInt(Math.floor((await time.latest()) / 86400));
    const hash = answerHash("purple", "party-secret");

    await expect(game.setDailyChallenge(day, hash))
      .to.emit(game, "DailyChallengeSet")
      .withArgs(day, hash);
    await expect(game.connect(player).play(day, ethers.id("purple"), ethers.id("party-secret")))
      .to.emit(game, "MilestoneCompleted")
      .withArgs(player.address, 1n);
    expect(await game.completed(player.address, day)).to.equal(true);
  });

  it("rejects a wrong answer and duplicate completion", async function () {
    const [owner, player] = await ethers.getSigners();
    const game = await ethers.deployContract("MonadPartyGame", [owner.address]);
    const day = BigInt(Math.floor((await time.latest()) / 86400));
    await game.setDailyChallenge(day, answerHash("purple", "party-secret"));

    await expect(game.connect(player).play(day, ethers.id("green"), ethers.id("party-secret")))
      .to.be.revertedWithCustomError(game, "WrongAnswer");
    await game.connect(player).play(day, ethers.id("purple"), ethers.id("party-secret"));
    await expect(game.connect(player).play(day, ethers.id("purple"), ethers.id("party-secret")))
      .to.be.revertedWithCustomError(game, "AlreadyCompleted");
  });

  it("keeps challenge administration and pause owner controlled", async function () {
    const [owner, player, stranger] = await ethers.getSigners();
    const game = await ethers.deployContract("MonadPartyGame", [owner.address]);
    const day = BigInt(Math.floor((await time.latest()) / 86400));
    const hash = answerHash("purple", "party-secret");

    await expect(game.connect(stranger).setDailyChallenge(day, hash))
      .to.be.revertedWithCustomError(game, "OwnableUnauthorizedAccount");
    await game.setDailyChallenge(day, hash);
    await game.pause();
    await expect(game.connect(player).play(day, ethers.id("purple"), ethers.id("party-secret")))
      .to.be.revertedWithCustomError(game, "EnforcedPause");
  });
});
