import { expect } from "chai";
import { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

describe("EligibilityRegistry", function () {
  it("stores one immutable snapshot and verifies indexed wallet proofs", async function () {
    const [owner, walletA, walletB, walletC] = await ethers.getSigners();
    const registry = await ethers.deployContract("EligibilityRegistry", [owner.address]);
    const values = [
      [42n, 0n, walletA.address],
      [42n, 1n, walletB.address],
      [42n, 2n, walletC.address],
    ];
    const tree = StandardMerkleTree.of(values, ["uint256", "uint256", "address"]);

    await expect(registry.setRoot(42n, tree.root, values.length, "ipfs://snapshot"))
      .to.emit(registry, "RootSet")
      .withArgs(42n, tree.root, 3n, "ipfs://snapshot");

    expect(await registry.verifyProof(42n, 1n, walletB.address, tree.getProof(1))).to.equal(true);
    expect(await registry.verifyProof(42n, 0n, walletB.address, tree.getProof(1))).to.equal(false);
    await expect(registry.setRoot(42n, tree.root, 3n, "ipfs://other"))
      .to.be.revertedWithCustomError(registry, "RootAlreadySet");
  });

  it("rejects snapshots that cannot produce three winners", async function () {
    const [owner] = await ethers.getSigners();
    const registry = await ethers.deployContract("EligibilityRegistry", [owner.address]);
    await expect(registry.setRoot(1n, ethers.id("root"), 2n, ""))
      .to.be.revertedWithCustomError(registry, "InvalidEligibleCount");
  });

  it("lets the owner rotate a limited snapshot publisher", async function () {
    const [owner, publisher, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("EligibilityRegistry", [owner.address]);
    await expect(registry.setPublisher(publisher.address))
      .to.emit(registry, "PublisherSet")
      .withArgs(publisher.address);
    await expect(registry.setRoot(2n, ethers.id("root"), 3n, ""))
      .to.be.revertedWithCustomError(registry, "NotPublisher");
    await expect(registry.connect(stranger).setPublisher(stranger.address))
      .to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    await expect(registry.connect(publisher).setRoot(2n, ethers.id("root"), 3n, ""))
      .to.emit(registry, "RootSet");
  });
});
