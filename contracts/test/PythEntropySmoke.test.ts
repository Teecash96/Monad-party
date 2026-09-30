import { expect } from "chai";
import { ethers } from "hardhat";

describe("PythEntropySmoke", function () {
  it("records the request and authenticated callback", async function () {
    const [owner] = await ethers.getSigners();
    const entropy = await ethers.deployContract("MockEntropy");
    const smoke = await ethers.deployContract("PythEntropySmoke", [await entropy.getAddress(), owner.address]);

    await expect(smoke.request({ value: 1n })).to.emit(smoke, "RandomnessRequested").withArgs(1n, 1n);
    const randomNumber = ethers.id("entropy smoke");
    await expect(entropy.fulfill(1n, randomNumber))
      .to.emit(smoke, "RandomnessReceived")
      .withArgs(1n, await entropy.getAddress(), randomNumber);
    expect(await smoke.lastRandomNumber()).to.equal(randomNumber);
  });

  it("rejects the wrong fee and nonowner requests", async function () {
    const [owner, other] = await ethers.getSigners();
    const entropy = await ethers.deployContract("MockEntropy");
    const smoke = await ethers.deployContract("PythEntropySmoke", [await entropy.getAddress(), owner.address]);

    await expect(smoke.request({ value: 2n })).to.be.revertedWithCustomError(smoke, "FeeMismatch");
    await expect(smoke.connect(other).request({ value: 1n }))
      .to.be.revertedWithCustomError(smoke, "OwnableUnauthorizedAccount");
  });
});
