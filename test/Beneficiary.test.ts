import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { Contract, providers, Wallet } from "ethers";
import { parseEther } from "ethers/lib/utils";

let deployer: SignerWithAddress,
  team: SignerWithAddress,
  dao: SignerWithAddress,
  rewardsFund: SignerWithAddress,
  og69: SignerWithAddress;

let lcAlpha: Contract;
let beneficiary: Contract;

describe("Beneficiary", function () {
  before(async function () {
    ({ deployer, team, dao, rewardsFund } = await ethers.getNamedSigners());
    [og69] = await ethers.getUnnamedSigners();
  });

  beforeEach(async function () {
    await deployments.fixture(["Beneficiary", "LCAlpha"]);
    beneficiary = await ethers.getContract("Beneficiary");
    lcAlpha = await ethers.getContract("LCAlpha");
  });

  it("should fail if shares not sum to 100", async function () {
    const cFactory = await ethers.getContractFactory("Beneficiary");
    await expect(
      cFactory.deploy(
        [team.address, dao.address, rewardsFund.address, og69.address],
        [45, 30, 15, 11]
      )
    ).to.be.revertedWith("Shares sum != 100");
  });

  it("should fail if shares and payees have different lengths", async function () {
    const cFactory = await ethers.getContractFactory("Beneficiary");
    await expect(
      cFactory.deploy(
        [team.address, dao.address, rewardsFund.address, og69.address],
        [45, 30, 15, 10, 1]
      )
    ).to.be.revertedWith("Incorrect data");
  });

  it("should be able to withdraw", async function () {
    const cFactory = await ethers.getContractFactory("Beneficiary");
    const wallets = [
      Wallet.createRandom().connect(ethers.provider),
      Wallet.createRandom().connect(ethers.provider),
      Wallet.createRandom().connect(ethers.provider),
      Wallet.createRandom().connect(ethers.provider),
    ];
    const addresses = wallets.map((x) => x.getAddress());

    const beneficiary = await cFactory.deploy(addresses, [45, 30, 15, 10]);

    const value = parseEther("0.06");

    await deployer.sendTransaction({
      to: beneficiary.address,
      value: value,
    });

    await expect(await beneficiary.withdraw()).to.changeEtherBalances(wallets, [
      value.mul(45).div(100),
      value.mul(30).div(100),
      value.mul(15).div(100),
      value.mul(10).div(100),
    ]);

    expect(await ethers.provider.getBalance(beneficiary.address)).to.be.equal(
      0
    );
  });

  it("should be able to withdraw from LCA contract", async function () {
    const mintPrice = parseEther("0.08");
    await lcAlpha.setSaleState(2);

    const overrides = { value: mintPrice };
    await lcAlpha.mint(1, overrides);

    await lcAlpha.setBeneficiary(beneficiary.address);
    await lcAlpha.withdraw();

    expect(await ethers.provider.getBalance(beneficiary.address)).to.be.equal(
      mintPrice
    );
  });

  it("only owner should be able to call setPayees", async function () {
    await beneficiary.setPayees([deployer.address, team.address], [60, 40]);

    expect(await beneficiary.shares(0)).to.be.equal(60);
    expect(await beneficiary.shares(1)).to.be.equal(40);

    await expect(
      beneficiary
        .connect(team)
        .setPayees([deployer.address, team.address], [60, 40])
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
