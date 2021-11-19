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
} from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract, utils } from "ethers";

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
    const mintAmount = parseEther("1000000");
    const transferAmount = parseEther("5000");

    // await deployments.fixture();

    const contractFatory = await ethers.getContractFactory(
      "Apollo2022Mock",
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

      await increaseTime(time.days(6));

      await apollo2022.connect(alice).claimTicket(alice.address);
      const balance = await apollo2022.balanceOf(alice.address);
      expect(balance).to.equal(1);

      available = await apollo2022.available();
      expect(available).to.equal(999);
    });

    it("should be able to claim upto 5 tokens per address", async function () {
      await increaseTime(time.days(6));

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

    it("shouldn't be able to claim multiple tokens using a smart contract", async function () {
      await increaseTime(time.days(6));

      const contractFactory = await ethers.getContractFactory(
        "ClaimAttacker",
        deployer
      );

      const attacker = await contractFactory.deploy(apollo2022.address);

      await expect(attacker.attack1(alice.address, 5)).to.be.revertedWith(
        "Must use EOA"
      );

      // On vulnerable contract the attack succeeds
      await attacker.attack2(alice.address, 5);
      expect(await apollo2022.balanceOf(alice.address)).to.be.equal(5);
    });
  });

  describe("#buyToken()", function () {
    it("should be able to buy tokens when available >= 0", async function () {
      await increaseTime(time.days(5) + time.seconds(432));

      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      expect(await apollo2022.available()).to.be.equal(0);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);
      expect(await apollo2022.available()).to.equal(0);
    });

    it("should be able to buy upto 5 tokens per address", async function () {
      await increaseTime(time.days(5) + time.seconds(432));

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

  describe("#getHolders()", function () {
    it("should return correct values", async function () {
      setAutomine(false);
      let genAddress = utils.keccak256(utils.toUtf8Bytes("gm my fren"));
      genAddress = genAddress.substring(0, 42);
      const prefix = genAddress.substr(0, 32);
      const genPart = genAddress.substr(32);
      const genInt = parseInt(genPart, 16);
      const maxSupply = await apollo2022.maxSupply();

      let addresses: string[] = [];
      for (let i = 1; i <= maxSupply; i++) {
        const postfix = (genInt + i).toString(16);
        addresses.push(`${prefix}${postfix}`);
        if (i % 100 == 0) {
          await apollo2022.bulkMint(addresses);
          await mine();
          addresses = [];
        }
      }
      await mine();
      expect(await apollo2022.totalSupply()).to.be.equal(maxSupply);

      const hodlersLength = await apollo2022.holdersLength();
      let hodlers: string[] = await apollo2022["getHolders()"]();
      expect(hodlersLength).to.be.equal(maxSupply);
      expect(hodlers.length).to.be.equal(maxSupply);

      hodlers = await apollo2022["getHolders(uint256,uint256)"](5, 10);
      expect(hodlers.length).to.be.equal(10);

      const h1: string = await apollo2022.holders(5);
      const h2: string = await apollo2022.holders(14);
      expect(hodlers[0]).to.be.equal(h1);
      expect(hodlers[hodlers.length - 1]).to.be.equal(h2);

      setAutomine(true);
    });
  });

  describe("#ownerOf", function () {
    it("should be able to get all addresses", async function () {
      await increaseTime(time.days(6));

      await apollo2022.connect(alice).buyTicket(alice.address, 3);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);
      await apollo2022.connect(carol).claimTicket(carol.address);
      await apollo2022.connect(carol).claimTicket(carol.address);

      const supply = await apollo2022.totalSupply();
      // iterate over token_ids
      interface AddressCounts {
        [index: string]: number;
      }
      let owners: AddressCounts = {};
      for (let i = 0; i < supply; i++) {
        const address: string = await apollo2022.ownerOf(i);
        if (!owners[address]) {
          owners[address] = 1;
        } else {
          owners[address]++;
        }
      }

      expect(owners[alice.address]).to.be.equal(3);
      expect(owners[bob.address]).to.be.equal(5);
      expect(owners[carol.address]).to.be.equal(2);
    });
  });
});
