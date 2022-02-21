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

enum SaleState {
  Paused,
  BoardingPass,
  Open,
}

let deployer: SignerWithAddress,
  alice: SignerWithAddress,
  bob: SignerWithAddress,
  carol: SignerWithAddress;
let lcAlpha: Contract;

describe("LCAlpha", function () {
  before(async function () {
    [alice, bob, carol] = await ethers.getUnnamedSigners();
    ({ deployer } = await ethers.getNamedSigners());
  });

  beforeEach(async function () {
    await deployments.fixture(["LCAlpha"]);
    lcAlpha = await ethers.getContract("LCAlpha");
  });

  afterEach(async function () {
    await setAutomine(true);
  });

  describe("#tokenURI", function () {
    it("should fail to get URI of nonexistent token", async function () {
      await expect(lcAlpha.tokenURI(0)).to.be.revertedWith(
        "ERC721Metadata: URI query for nonexistent token"
      );
    });
  });

  describe("#setBaseURI", function () {
    it("should emit correct Event", async function () {
      const uri = "http://gm.fren";
      await expect(lcAlpha.setBaseURI(uri))
        .to.emit(lcAlpha, "SetBaseURI")
        .withArgs(uri);
    });

    it("should be able to set baseUri", async function () {
      lcAlpha.setSaleState(SaleState.Open);

      const overrides = { value: ethers.utils.parseEther("0.08") };
      await lcAlpha.connect(alice).mint(1, overrides);
      await lcAlpha.connect(bob).mint(1, overrides);

      let aliceTokenUri = await lcAlpha.tokenURI(0);
      let bobTokenUri = await lcAlpha.tokenURI(1);
      expect(aliceTokenUri).to.be.equal(bobTokenUri).to.be.equal("");

      await lcAlpha.setBaseURI("http://gm.fren/");
      aliceTokenUri = await lcAlpha.tokenURI(0);
      bobTokenUri = await lcAlpha.tokenURI(1);

      expect(aliceTokenUri).to.be.equal("http://gm.fren/0");
      expect(bobTokenUri).to.be.equal("http://gm.fren/1");
    });
  });
});
