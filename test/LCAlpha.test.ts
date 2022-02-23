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
  TreeData,
  BpMerkleTree,
} from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract } from "ethers";
import { parseEther } from "ethers/lib/utils";
import MerkleTree from "merkletreejs";

enum SaleState {
  Paused,
  BoardingPass,
  Open,
}

let mintPrice = parseEther("0.08");
let bpMintPrice = parseEther("0.06");

let deployer: SignerWithAddress,
  alice: SignerWithAddress,
  bob: SignerWithAddress,
  carol: SignerWithAddress;
let lcAlpha: Contract;
let treeData: TreeData;
let tree: BpMerkleTree;

describe("LCAlpha", function () {
  before(async function () {
    [alice, bob, carol] = await ethers.getUnnamedSigners();
    ({ deployer } = await ethers.getNamedSigners());
    treeData = {
      [alice.address]: { amount: 1 },
      [bob.address]: { amount: 2 },
      [carol.address]: { amount: 3 },
    };
    tree = new BpMerkleTree(treeData);
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
    it("should be able to set baseUri", async function () {
      await lcAlpha.setSaleState(SaleState.Open);

      const overrides = { value: mintPrice };
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

  describe("#bpMint()", function () {
    beforeEach(async function () {
      await lcAlpha.setMerkleRoot(tree.getRoot());
    });

    it("should fail to mint tokens when the boarding pass owners sale is not active", async function () {
      await expect(
        lcAlpha.bpMint(1, 1, [], { value: bpMintPrice })
      ).to.be.revertedWith("Sale not active");
    });

    it("should fail to mint tokens when ETH amount is provided", async function () {
      await lcAlpha.setSaleState(SaleState.BoardingPass);
      await expect(
        lcAlpha.bpMint(1, 1, [], { value: bpMintPrice.mul(2) })
      ).to.be.revertedWith("Incorrect ETH value sent");
    });

    it("should fail if wrong proof is provided", async function () {
      await lcAlpha.setSaleState(SaleState.BoardingPass);
      const wrongTree = new BpMerkleTree({
        [alice.address]: { amount: 2 },
        [bob.address]: { amount: 2 },
        [carol.address]: { amount: 3 },
      });
      const proof = wrongTree.getProof(alice.address, 2);

      await expect(
        lcAlpha.connect(alice).bpMint(1, 2, proof, { value: bpMintPrice })
      ).to.be.revertedWith("Invalid Merkle Tree proof supplied");
    });

    it("should succeed if valid proof is provided and emit Transfer event", async function () {
      await lcAlpha.setSaleState(SaleState.BoardingPass);
      const proof = tree.getProof(alice.address, 1);

      await expect(
        lcAlpha.connect(alice).bpMint(1, 1, proof, { value: bpMintPrice })
      ).to.emit(lcAlpha, "Transfer");

      const balance = await lcAlpha.balanceOf(alice.address);
      expect(balance).to.equal(1);
    });

    it("shouldn't be able to mint more than allowed", async function () {
      await lcAlpha.setSaleState(SaleState.BoardingPass);
      let proof = tree.getProof(carol.address, 3);

      await lcAlpha.connect(carol).bpMint(1, 3, proof, { value: bpMintPrice });
      await lcAlpha.connect(carol).bpMint(1, 3, proof, { value: bpMintPrice });
      await lcAlpha.connect(carol).bpMint(1, 3, proof, { value: bpMintPrice });
      await expect(
        lcAlpha.connect(carol).bpMint(1, 3, proof, { value: bpMintPrice })
      ).to.be.revertedWith("Exceeds allowed amount");

      expect(await lcAlpha.balanceOf(carol.address)).to.equal(3);

      proof = tree.getProof(alice.address, 1);
      await expect(
        lcAlpha
          .connect(alice)
          .bpMint(2, 1, proof, { value: bpMintPrice.mul(2) })
      ).to.be.revertedWith("Exceeds allowed amount");

      expect(await lcAlpha.balanceOf(alice.address)).to.equal(0);
    });
  });
});
