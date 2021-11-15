import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import {
  increaseTime,
  time,
  blockTimestamp,
  getErc20Factory,
  ERC20Factory,
  setAutomine,
  mine,
  hdNodeGen,
} from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract, Wallet } from "ethers";

let deployer: SignerWithAddress,
  alice: SignerWithAddress,
  bob: SignerWithAddress,
  carol: SignerWithAddress;
let erc20Factory: ERC20Factory;
let apollo2022: Contract;
let weth: Contract;

const { parseEther } = ethers.utils;
const { MaxUint256, Zero } = ethers.constants;

describe("Apollo2020", function () {
  before(async function () {
    [alice, bob, carol] = await ethers.getUnnamedSigners();
    ({ deployer } = await ethers.getNamedSigners());
    erc20Factory = await getErc20Factory();
  });

  beforeEach(async function () {
    const mintAmount = parseEther("15000");
    const transferAmount = parseEther("5000");

    // await deployments.fixture();

    const contractFatory = await ethers.getContractFactory(
      "Apollo2022",
      deployer
    );

    weth = await erc20Factory.deploy("Wrapped ETH", "WETH", mintAmount);

    setAutomine(false);
    const start = (await blockTimestamp()) + time.days(5) + 1;
    // START + 5 days
    const end = start + time.days(10);

    apollo2022 = await contractFatory.deploy(start, end, weth.address);

    await weth.transfer(alice.address, transferAmount);
    await weth.transfer(bob.address, transferAmount);
    await weth.transfer(carol.address, transferAmount);

    await weth.connect(alice).approve(apollo2022.address, MaxUint256);
    await weth.connect(bob).approve(apollo2022.address, MaxUint256);
    await weth.connect(carol).approve(apollo2022.address, MaxUint256);
    await mine();
    setAutomine(true);
  });

  // We can split this into multiple tests
  it("should calculate correct values for available tokens", async function () {
    // before release date
    let available = await apollo2022.available();
    expect(available).to.equal(0);

    // inside release period
    const start: BigNumber = await apollo2022.releaseStart();
    const b1 = await increaseTime(time.days(6));
    const period = b1.timestamp - start.toNumber();

    expect(period).to.equals(time.days(1));

    available = await apollo2022.available();
    expect(available).to.equals(1000);

    // release 1 token per 86.4 seconds so after 85 sec no new tokens are released
    const b2 = await increaseTime(time.seconds(85));

    available = await apollo2022.available();
    expect(available).to.equals(1000);

    // 2 seconds later 1 new token is released
    const b3 = await increaseTime(time.seconds(2));

    available = await apollo2022.available();
    expect(available).to.equals(1001);

    // outside release period
    const b4 = await increaseTime(time.days(10));

    available = await apollo2022.available();
    expect(available).to.equals(10000);
  });

  describe("#claimToken()", function () {
    it("should fail to claim tokens when there are 0 available", async function () {
      // before release date
      let available = await apollo2022.available();
      expect(available).to.equal(0);

      await expect(apollo2022.claimTicket(deployer.address)).to.be.revertedWith(
        "No tickets available"
      );
    });

    it("should be able to claim tokens when there are >0 available", async function () {
      // before release date
      let available = await apollo2022.available();
      expect(available).to.equal(0);

      const b1 = await increaseTime(time.days(6));

      await apollo2022.connect(alice).claimTicket(alice.address);
      const balance = await apollo2022.balanceOf(alice.address);
      expect(balance).to.equal(1);

      available = await apollo2022.available();
      expect(available).to.equal(999);
    });

    it("should be able to claim upto 5 tokens per address", async function () {
      const b1 = await increaseTime(time.days(6));

      await apollo2022.connect(alice).claimTicket(alice.address);
      await apollo2022.connect(alice).claimTicket(alice.address);
      await apollo2022.connect(alice).claimTicket(alice.address);
      await apollo2022.connect(alice).claimTicket(alice.address);
      await apollo2022.connect(alice).claimTicket(alice.address);
      const balance = await apollo2022.balanceOf(alice.address);
      expect(balance).to.equal(5);

      await expect(
        apollo2022.connect(alice).claimTicket(alice.address)
      ).to.be.revertedWith("Max limit per address exceeded");

      let available = await apollo2022.available();
      expect(available).to.equal(995);
    });
  });

  describe("#buyToken()", function () {
    it("should be able to buy tokens when available >= 0", async function () {
      const b1 = await increaseTime(time.days(5) + time.seconds(432));

      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      expect(await apollo2022.available()).to.be.equal(0);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);
      expect(await apollo2022.available()).to.equal(0);
    });

    it("should be able to buy upto 5 tokens", async function () {
      const b1 = await increaseTime(time.days(5) + time.seconds(432));

      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 4);
      expect(await apollo2022.available()).to.equal(1);
      await apollo2022.connect(alice).claimTicket(alice.address);
      expect(await apollo2022.available()).to.be.equal(0);
      await expect(
        apollo2022.connect(alice).claimTicket(alice.address)
      ).to.be.revertedWith("Max limit per address exceeded");
      await expect(
        apollo2022.connect(alice).buyTicket(alice.address, 1)
      ).to.be.revertedWith("Max limit per address exceeded");
    });

    it("should delay the release of new tokens", async function () {
      await increaseTime(time.days(5) + time.seconds(432));
      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);

      await increaseTime(time.seconds(432));
      expect(await apollo2022.available()).to.equal(0);

      await increaseTime(time.seconds(432));
      expect(await apollo2022.available()).to.equal(5);
    });
  });

  describe.skip("Snapshot holders", function () {
    it("should be able to retreive 10k holders", async function () {
      const hdNode = ethers.utils.HDNode.fromMnemonic(
        "test test test test test test test test test test test junk"
      );
      for (const [_, newHdNode] of hdNodeGen(hdNode, 0, 10)) {
        new Wallet(newHdNode.privateKey);
      }
    });
  });
});
