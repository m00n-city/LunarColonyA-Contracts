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
import { BigNumber, Contract } from "ethers";

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

    await deployments.fixture();

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

  it("available() should calculate correct values", async function () {
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
});
