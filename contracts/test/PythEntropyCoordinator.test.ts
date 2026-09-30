import { expect } from "chai";
import { ethers } from "hardhat";

describe("PythEntropyCoordinator", function () {
  it("routes a paid Entropy callback into three deterministic words", async function () {
    const [owner] = await ethers.getSigners();
    const entropy = await ethers.deployContract("MockEntropy");
    const coordinator = await ethers.deployContract("PythEntropyCoordinator", [
      await entropy.getAddress(),
      owner.address,
    ]);
    const wrapper = await ethers.deployContract("VRFWrapper", [
      await coordinator.getAddress(),
      owner.address,
    ]);
    const consumer = await ethers.deployContract("MockRandomnessConsumer", [await wrapper.getAddress()]);
    await wrapper.setConsumer(await consumer.getAddress());
    await coordinator.setRequester(await wrapper.getAddress());

    await consumer.request(77n, { value: 1n });
    expect(await wrapper.getRequestEpoch(1n)).to.equal(77n);

    await entropy.fulfill(1n, ethers.id("weekly draw"));
    expect(await consumer.lastRequestId()).to.equal(1n);
    expect(await consumer.word(0n)).to.equal(BigInt(ethers.id("weekly draw")));
    expect(await consumer.word(1n)).not.to.equal(await consumer.word(0n));
    expect(await consumer.word(2n)).not.to.equal(await consumer.word(1n));
    expect(await coordinator.delivered(1n)).to.equal(true);
  });
});
