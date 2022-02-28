import { ethers, deployments } from "hardhat";
import { expect } from "chai";
import { setAutomine, TreeData, BpMerkleTree, range } from "../utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract } from "ethers";
import { parseEther } from "ethers/lib/utils";

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

      await lcAlpha.setSaleState(SaleState.Open);

      await expect(
        lcAlpha.bpMint(1, 1, [], { value: bpMintPrice })
      ).to.be.revertedWith("Sale not active");
    });

    it("should fail to mint tokens when incorrect ETH amount is provided", async function () {
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

  describe("#mint()", function () {
    it("should fail to mint tokens when the public sale is not active", async function () {
      await expect(lcAlpha.mint(1, { value: mintPrice })).to.be.revertedWith(
        "Sale not active"
      );

      await lcAlpha.setSaleState(SaleState.BoardingPass);

      await expect(lcAlpha.mint(1, { value: mintPrice })).to.be.revertedWith(
        "Sale not active"
      );
    });

    it("should fail to mint tokens when incorrect ETH amount is provided", async function () {
      await lcAlpha.setSaleState(SaleState.Open);
      await expect(
        lcAlpha.mint(1, { value: bpMintPrice.mul(2) })
      ).to.be.revertedWith("Incorrect ETH value sent");

      await expect(
        lcAlpha.mint(1, { value: bpMintPrice.add(1) })
      ).to.be.revertedWith("Incorrect ETH value sent");

      await expect(
        lcAlpha.mint(1, { value: bpMintPrice.sub(1) })
      ).to.be.revertedWith("Incorrect ETH value sent");
    });

    it("should be able to mint a token and emit Transfer event", async function () {
      await lcAlpha.setSaleState(SaleState.Open);

      await expect(
        lcAlpha.connect(alice).mint(1, { value: mintPrice })
      ).to.emit(lcAlpha, "Transfer");

      const balance = await lcAlpha.balanceOf(alice.address);
      expect(balance).to.equal(1);
    });

    it("shouldn't be able to mint more than allowed", async function () {
      await lcAlpha.setSaleState(SaleState.Open);

      await lcAlpha.connect(carol).mint(1, { value: mintPrice });
      await lcAlpha.connect(carol).mint(1, { value: mintPrice });
      await lcAlpha.connect(carol).mint(20, { value: mintPrice.mul(20) });
      await expect(
        lcAlpha.connect(carol).mint(21, { value: mintPrice.mul(21) })
      ).to.be.revertedWith("Max purchase exceeded");

      expect(await lcAlpha.balanceOf(carol.address))
        .to.equal(await lcAlpha.totalSupply())
        .to.equal(22);
    });

    it.skip("should not allow to mint more than maxSupply", async function () {
      await lcAlpha.setSaleState(SaleState.Open);

      const maxSupply = (await lcAlpha.maxSupply()).sub(1).toNumber();
      const maxPurchase = (await lcAlpha.maxPurchase()).sub(1).toNumber();

      const count = maxSupply / maxPurchase;

      for (let i = 0; i < count - 1; i++) {
        await lcAlpha
          .connect(alice)
          .mint(maxPurchase, { value: mintPrice.mul(maxPurchase) });
      }

      await lcAlpha
        .connect(alice)
        .mint(maxPurchase, { value: mintPrice.mul(maxPurchase) });

      await expect(
        lcAlpha.connect(alice).mint(1, { value: mintPrice })
      ).to.be.revertedWith("Purchase would exceed max supply");
    });
  });

  describe("#withdraw", function () {
    it("should be able to withdraw ETH", async function () {
      await lcAlpha.setMerkleRoot(tree.getRoot());
      await lcAlpha.setSaleState(SaleState.BoardingPass);
      await lcAlpha.setBeneficiary(deployer.address);

      let proof = tree.getProof(alice.address, 1);
      await lcAlpha.connect(alice).bpMint(1, 1, proof, { value: bpMintPrice });

      proof = tree.getProof(bob.address, 2);
      await lcAlpha
        .connect(bob)
        .bpMint(2, 2, proof, { value: bpMintPrice.mul(2) });

      await expect(await lcAlpha.withdraw()).to.changeEtherBalances(
        [deployer, lcAlpha],
        [parseEther("0.18"), parseEther("-0.18")]
      );
    });
  });

  describe("#reserveTokens", function () {
    it("should be able to reserve tokens", async function () {
      const reservedTokens = await lcAlpha.reservedTokens();

      await lcAlpha.reserveTokens(carol.address);
      expect(await lcAlpha.balanceOf(carol.address)).to.be.equal(
        reservedTokens
      );

      expect(await lcAlpha.totalSupply()).to.be.equal(reservedTokens);
    });
  });

  describe("#setProvenanceHash", function () {
    it("should be able to set provenanceHash", async function () {
      const hash = "0x1234567";
      await lcAlpha.setProvenanceHash(hash);
      const provenanceHash = await lcAlpha.provenance();

      expect(hash).to.be.equal(provenanceHash);
    });
  });

  describe("#walletOfOwner", function () {
    it("should return correct ids", async function () {
      await lcAlpha.setMerkleRoot(tree.getRoot());
      await lcAlpha.setSaleState(SaleState.BoardingPass);

      // ids: [0]
      let proof = tree.getProof(carol.address, 3);
      await lcAlpha.connect(carol).bpMint(1, 3, proof, { value: bpMintPrice });

      // ids: [1,2]
      proof = tree.getProof(bob.address, 2);
      await lcAlpha
        .connect(bob)
        .bpMint(2, 2, proof, { value: bpMintPrice.mul(2) });

      // ids: [3]
      proof = tree.getProof(alice.address, 1);
      await lcAlpha.connect(alice).bpMint(1, 1, proof, { value: bpMintPrice });

      // ids: [4-103]
      await lcAlpha.reserveTokens(deployer.address);

      await lcAlpha.setSaleState(SaleState.Open);

      // ids: [104-114]
      await lcAlpha.connect(alice).mint(11, { value: mintPrice.mul(11) });

      async function walletOfOwner(address: string): Promise<number[]> {
        return (await lcAlpha.walletOfOwner(address)).map((v: BigNumber) =>
          v.toNumber()
        );
      }

      expect(await walletOfOwner(carol.address)).to.eql([0]);
      expect(await walletOfOwner(bob.address)).to.eql([1, 2]);
      expect(await walletOfOwner(deployer.address)).to.eql(range(4, 53));
      expect(await walletOfOwner(alice.address)).to.eql([3, ...range(54, 64)]);
    });
  });

  describe("#isApprovedForAll", function () {
    let proxyRegistry: Contract;

    beforeEach(async function () {
      const contractFactory = await ethers.getContractFactory(
        "ProxyRegistryMock",
        deployer
      );

      proxyRegistry = await contractFactory.deploy();
      await lcAlpha.setProxyRegistryAddress(proxyRegistry.address);
    });

    it("should revert when the operator is the owner", async function () {
      await expect(
        lcAlpha.connect(alice).setApprovalForAll(alice.address, true)
      ).to.be.revertedWith("ERC721: approve to caller");
    });

    it("should return true if the correct proxy address is correct", async function () {
      await proxyRegistry.setProxyForOwner(alice.address, bob.address);

      expect(
        await lcAlpha
          .connect(alice)
          .isApprovedForAll(alice.address, bob.address)
      ).to.equals(true);

      expect(
        await lcAlpha
          .connect(alice)
          .isApprovedForAll(alice.address, carol.address)
      ).to.equals(false);
    });
  });

  describe("#tokenURI", function () {
    it("should be able to set preRevealURI", async function () {
      await lcAlpha.setSaleState(SaleState.Open);

      const overrides = { value: mintPrice };
      await lcAlpha.connect(alice).mint(1, overrides);
      await lcAlpha.connect(bob).mint(1, overrides);

      let aliceTokenUri = await lcAlpha.tokenURI(0);
      let bobTokenUri = await lcAlpha.tokenURI(1);
      expect(aliceTokenUri).to.be.equal(bobTokenUri).to.be.equal("");

      await lcAlpha.setPreRevealURI("http://gm.fren/pre");
      aliceTokenUri = await lcAlpha.tokenURI(0);
      bobTokenUri = await lcAlpha.tokenURI(1);
      expect(aliceTokenUri)
        .to.be.equal(bobTokenUri)
        .to.be.equal("http://gm.fren/pre");
    });

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

    it("should prefer baseUri over preRevealURI", async function () {
      await lcAlpha.setSaleState(SaleState.Open);

      const overrides = { value: mintPrice };
      await lcAlpha.connect(alice).mint(1, overrides);
      await lcAlpha.connect(bob).mint(1, overrides);

      let aliceTokenUri = await lcAlpha.tokenURI(0);
      let bobTokenUri = await lcAlpha.tokenURI(1);
      expect(aliceTokenUri).to.be.equal(bobTokenUri).to.be.equal("");

      await lcAlpha.setPreRevealURI("http://gm.fren/pre");
      aliceTokenUri = await lcAlpha.tokenURI(0);
      bobTokenUri = await lcAlpha.tokenURI(1);
      expect(aliceTokenUri)
        .to.be.equal(bobTokenUri)
        .to.be.equal("http://gm.fren/pre");

      await lcAlpha.setBaseURI("http://gm.fren/");
      aliceTokenUri = await lcAlpha.tokenURI(0);
      bobTokenUri = await lcAlpha.tokenURI(1);
      expect(aliceTokenUri).to.be.equal("http://gm.fren/0");
      expect(bobTokenUri).to.be.equal("http://gm.fren/1");
    });
  });

  describe("#royaltyInfo", function () {
    it("should return correct values", async function () {
      await lcAlpha.setSaleState(SaleState.Open);
      await lcAlpha.setRoyalties(deployer.address, 5);

      expect(await lcAlpha.royaltyInfo(0, parseEther("1.0"))).to.eql([
        deployer.address,
        parseEther("0.05"),
      ]);

      await lcAlpha.setRoyalties(alice.address, 3);
      expect(await lcAlpha.royaltyInfo(0, parseEther("1.0"))).to.eql([
        alice.address,
        parseEther("0.03"),
      ]);
    });
  });
});
