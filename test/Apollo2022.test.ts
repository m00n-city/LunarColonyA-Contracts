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

    apollo2022 = await contractFatory.deploy(weth.address);

    await weth.transfer(alice.address, transferAmount);
    await weth.transfer(bob.address, transferAmount);
    await weth.transfer(carol.address, transferAmount);

    await weth.connect(alice).approve(apollo2022.address, MaxUint256);
    await weth.connect(bob).approve(apollo2022.address, MaxUint256);
    await weth.connect(carol).approve(apollo2022.address, MaxUint256);
    await mine();
    await setAutomine(true);
  });

  afterEach(async function () {
    await setAutomine(true);
  });

  // We can split this into multiple tests
  it("should calculate correct values for available tokens", async function () {
    const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
    const releaseEnd = releaseStart + time.days(5);
    await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

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
    const b4 = await increaseTime(time.days(6));

    available = await apollo2022.available();
    expect(available).to.equals(5000);
  });

  describe("#claimToken()", function () {
    it("should fail to claim tokens when the release has not started", async function () {
      await expect(apollo2022.claimTicket()).to.be.revertedWith(
        "Mint would exceed max supply of Tickets"
      );
    });

    it("should emit correct Event", async function () {
      const releaseStart = (await blockTimestamp()) - time.days(1);
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await expect(apollo2022.connect(alice).claimTicket())
        .to.emit(apollo2022, "ClaimTicket")
        .withArgs(alice.address);
    });

    it("should fail to claim tokens when there are 0 available", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      // before release date
      let available = await apollo2022.available();
      expect(available).to.equal(0);

      await expect(apollo2022.claimTicket()).to.be.revertedWith(
        "No tickets available"
      );
    });

    it("should be able to claim tokens when there are >0 available", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      // before release date
      let available = await apollo2022.available();
      expect(available).to.equal(0);

      await increaseTime(time.days(6));

      await apollo2022.connect(alice).claimTicket();
      const balance = await apollo2022.balanceOf(alice.address);
      expect(balance).to.equal(1);

      available = await apollo2022.available();
      expect(available).to.equal(999);
    });

    it("should be able to claim upto maxClaimsPerAddr tokens", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(6));

      const maxClaimsPerAddr: BigNumber = await apollo2022.maxClaimsPerAddr();

      for (let i = 0; i < maxClaimsPerAddr.toNumber(); i++) {
        await apollo2022.connect(alice).claimTicket();
      }

      const balance = await apollo2022.balanceOf(alice.address);
      expect(balance).to.equal(maxClaimsPerAddr);

      await expect(apollo2022.connect(alice).claimTicket()).to.be.revertedWith(
        "Max claims per address exceeded"
      );

      let available: BigNumber = await apollo2022.available();
      expect(available.add(maxClaimsPerAddr)).to.equal(1000);
    });

    it("shouldn't be able to claim more than maxMintsPerAddr tokens", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(6));

      const maxMintsPerAddr: BigNumber = await apollo2022.maxMintsPerAddr();

      await apollo2022.connect(alice).buyTicket(alice.address, maxMintsPerAddr);

      const balance = await apollo2022.balanceOf(alice.address);
      expect(balance).to.equal(maxMintsPerAddr);

      await expect(apollo2022.connect(alice).claimTicket()).to.be.revertedWith(
        "Max mints per address exceeded"
      );
    });

    it("shouldn't be able to claim multiple tokens using a smart contract", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(6));

      const contractFactory = await ethers.getContractFactory(
        "ClaimAttacker",
        deployer
      );

      const attacker = await contractFactory.deploy(apollo2022.address);

      await expect(attacker.attack1(5)).to.be.revertedWith("Must use EOA");

      // On vulnerable contract the attack succeeds
      await attacker.attack2(5);
      expect(await apollo2022.balanceOf(attacker.address)).to.be.equal(5);
    });

    it("should fail to claim a new token if we reach the max supply", async function () {
      const start = (await blockTimestamp()) - time.minutes(10);
      const end = start + time.minutes(5);
      await apollo2022.setupRelease(start, end, 5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      //FIXME "Mint would exceed max supply of Tickets"
      await expect(apollo2022.connect(bob).claimTicket()).to.be.revertedWith(
        "Mint would exceed max supply of Tickets"
      );
    });
  });

  describe("#buyToken()", function () {
    it("should emit correct Event", async function () {
      const releaseStart = await blockTimestamp();
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      const amount = 2;
      await expect(apollo2022.connect(alice).buyTicket(bob.address, amount))
        .to.emit(apollo2022, "BuyTicket")
        .withArgs(bob.address, alice.address, amount);
    });

    it("should be able to buy tokens when available >= 0", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(5) + time.seconds(432));

      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      expect(await apollo2022.available()).to.be.equal(0);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);
      expect(await apollo2022.available()).to.equal(0);
    });

    it("should be able to buy upto 5 tokens per address", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(5) + time.seconds(432));

      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 4);
      expect(await apollo2022.available()).to.equal(1);

      await expect(
        apollo2022.connect(alice).buyTicket(alice.address, 4)
      ).to.be.revertedWith("Max mints per address exceeded");

      await apollo2022.connect(alice).claimTicket();
      expect(await apollo2022.available()).to.be.equal(0);

      await expect(
        apollo2022.connect(alice).buyTicket(alice.address, 1)
      ).to.be.revertedWith("Max mints per address exceeded");
    });

    it("should delay the release of new tokens", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(5) + time.seconds(432));
      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);

      await increaseTime(time.seconds(432));
      expect(await apollo2022.available()).to.equal(0);

      await increaseTime(time.seconds(432));
      expect(await apollo2022.available()).to.equal(5);
    });

    it("should fail to buy a new token if we reach the max supply", async function () {
      const start = (await blockTimestamp()) - time.minutes(10);
      const end = start + time.minutes(5);
      await apollo2022.setupRelease(start, end, 5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      await expect(
        apollo2022.connect(bob).buyTicket(bob.address, 1)
      ).to.be.revertedWith("Mint would exceed max supply of Tickets");
    });
  });

  describe("#getHolders()", function () {
    it.skip("should be able to get all holders", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      setAutomine(false);
      let genAddress = utils.keccak256(utils.toUtf8Bytes("gm my fren"));
      genAddress = genAddress.substring(0, 42);
      const prefix = genAddress.substr(0, 32);
      const genPart = genAddress.substr(32);
      const genInt = parseInt(genPart, 16);
      const maxSupply = await apollo2022.releaseMaxSupply();

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
    });
  });

  describe("#ownerOf", function () {
    it("should be able to get all addresses", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(6));

      await apollo2022.connect(alice).buyTicket(alice.address, 3);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);
      await apollo2022.connect(carol).claimTicket();
      await apollo2022.connect(carol).buyTicket(carol.address, 1);

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

  describe("#tokenURI", function () {
    it("should failt to get URI of nonexistent token", async function () {
      await expect(apollo2022.tokenURI(0)).to.be.revertedWith(
        "ERC721Metadata: URI query for nonexistent token"
      );
    });
  });
  describe("#setBaseURI", function () {
    it("should emit correct Event", async function () {
      const uri = "http://gm.fren";
      await expect(apollo2022.setBaseURI(uri))
        .to.emit(apollo2022, "SetBaseURI")
        .withArgs(uri);
    });

    it("should be able to set baseUri", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await increaseTime(time.days(6));

      await apollo2022.connect(alice).claimTicket();
      await apollo2022.connect(bob).claimTicket();

      let aliceTokenUri = await apollo2022.tokenURI(0);
      let bobTokenUri = await apollo2022.tokenURI(1);
      expect(aliceTokenUri).to.be.equal(bobTokenUri).to.be.equal("");

      await apollo2022.setBaseURI("http://gm.fren");
      aliceTokenUri = await apollo2022.tokenURI(0);
      bobTokenUri = await apollo2022.tokenURI(1);
      expect(aliceTokenUri)
        .to.be.equal(bobTokenUri)
        .to.be.equal("http://gm.fren");
    });
  });

  describe("#setupRelease", function () {
    it("should emit correct Event", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      const supply = 5000;
      await expect(apollo2022.setupRelease(releaseStart, releaseEnd, supply))
        .to.emit(apollo2022, "SetupRelease")
        .withArgs(releaseStart, releaseEnd, supply);
    });

    it("should not be able to setup new distribution before the end of the previous", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      // inside release period
      await increaseTime(time.days(6));

      let start = await blockTimestamp();
      let end = start + time.days(1);
      await expect(
        apollo2022.setupRelease(start, end, 1000)
      ).to.be.revertedWith("Previous release is still running");

      // outside release period but there are still available to claim tokens
      const block = await increaseTime(time.days(6));

      start = block.timestamp;
      end = block.timestamp + time.days(1);
      await expect(
        apollo2022.setupRelease(start, end, 1000)
      ).to.be.revertedWith("Previous release is still running");

      const available: BigNumber = await apollo2022.available();
      expect(available).to.be.equal(5000);
    });

    it("should be able to set a distribution initial supply by setting start < now", async function () {
      const start = (await blockTimestamp()) - time.minutes(5);
      const end = start + time.minutes(10);
      await apollo2022.setupRelease(start, end, 10);

      expect(await apollo2022.available()).to.be.equal(5);
    });

    it("should be able to set new distribution when all tokens are minted", async function () {
      let start = await blockTimestamp();
      let end = start + time.minutes(10);
      await apollo2022.setupRelease(start, end, 10);

      await increaseTime(time.minutes(5));
      expect(await apollo2022.available()).to.be.equal(5);

      await expect(apollo2022.setupRelease(start, end, 10)).to.be.revertedWith(
        "Previous release is still running"
      );

      await apollo2022.connect(alice).buyTicket(alice.address, 5);

      await increaseTime(time.minutes(5));
      expect(await apollo2022.available()).to.be.equal(5);

      await apollo2022.connect(alice).buyTicket(bob.address, 5);
      expect(await apollo2022.available()).to.be.equal(0);

      start = (await blockTimestamp()) - time.minutes(5);
      end = start + time.minutes(10);

      await apollo2022.setupRelease(start, end, 10);

      expect(await apollo2022.available()).to.be.equal(5);
    });

    it("should fail if we set release supply to exceed the max supply", async function () {
      const start = (await blockTimestamp()) - time.minutes(5);
      const end = start + time.minutes(10);

      await expect(
        apollo2022.setupRelease(start, end, 10001)
      ).to.be.revertedWith("Incorrect releaseMaxSupply value");
    });
  });

  describe("#withdrawWETH", function () {
    it("should be able to withdraw ETH", async function () {
      const releaseStart = (await blockTimestamp()) + time.days(5) + 1;
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);

      await expect(() => apollo2022.withdrawWETH()).to.changeTokenBalances(
        weth,
        [deployer, apollo2022],
        [parseEther("0.05"), parseEther("-0.05")]
      );
    });
  });

  describe("#reserveTickets", function () {
    it("should be able to reserve tickets", async function () {
      await apollo2022.reserveTickets(carol.address, 10);
      expect(await apollo2022.balanceOf(carol.address)).to.be.equal(10);
    });

    it("should emit correct Event", async function () {
      const releaseStart = await blockTimestamp();
      const releaseEnd = releaseStart + time.days(5);
      await apollo2022.setupRelease(releaseStart, releaseEnd, 5000);

      const amount = 2;
      await expect(apollo2022.reserveTickets(alice.address, amount))
        .to.emit(apollo2022, "ReserveTickets")
        .withArgs(alice.address, amount);
    });

    it("should not break the release calculation", async function () {
      await apollo2022.reserveTickets(carol.address, 10);

      let start = await blockTimestamp();
      let end = start + time.minutes(15);
      await apollo2022.setupRelease(start, end, 15);

      await increaseTime(time.minutes(5));
      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(alice).buyTicket(alice.address, 5);
      await apollo2022.connect(bob).buyTicket(bob.address, 5);

      await increaseTime(time.minutes(5));
      expect(await apollo2022.available()).to.equal(0);

      await increaseTime(time.minutes(5));
      expect(await apollo2022.available()).to.equal(5);

      await apollo2022.connect(carol).buyTicket(carol.address, 5);

      await apollo2022.reserveTickets(carol.address, 10);

      start = await blockTimestamp();
      end = start + time.minutes(15);
      await apollo2022.setupRelease(start, end, 15);

      await increaseTime(time.minutes(5));
      expect(await apollo2022.available()).to.equal(5);

      expect(await apollo2022.balanceOf(carol.address)).to.be.equal(25);
    });

    it("should fail to reserve more thickets than maxSupply", async function () {
      const maxSupply = await apollo2022.maxSupply();
      await expect(
        apollo2022.reserveTickets(carol.address, maxSupply.add(1))
      ).to.be.revertedWith("Mint would exceed max supply of Tickets");
    });

    it("should fail to reserve more thickets than reserveMaxAmount", async function () {
      const reserveMaxAmount = await apollo2022.reserveMaxAmount();
      await expect(
        apollo2022.reserveTickets(carol.address, reserveMaxAmount.add(1))
      ).to.be.revertedWith("Mint would exeed max allowed reserve amount");
    });
  });
});
