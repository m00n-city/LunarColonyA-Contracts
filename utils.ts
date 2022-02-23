import { ParamType } from "@ethersproject/abi";
import { BigNumberish, ContractFactory } from "ethers";
import { HDNode, keccak256 } from "ethers/lib/utils";
import { ethers } from "hardhat";
import MerkleTree from "merkletreejs";
import fs from "fs";

export async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  return mine();
}

export async function mine() {
  await ethers.provider.send("evm_mine", []);
  return ethers.provider.getBlock("latest");
}

export function setAutomine(value: boolean): Promise<any> {
  return ethers.provider.send("evm_setAutomine", [value]);
}

export function setIntervalMining(value: number): Promise<any> {
  return ethers.provider.send("evm_setIntervalMining", [value]);
}

export function encodeParams(
  types: readonly (string | ParamType)[],
  values: readonly any[]
): string {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

export async function blockTimestamp(blockTag = "latest"): Promise<number> {
  const block = await ethers.provider.getBlock(blockTag);
  return block.timestamp;
}

export const time = {
  now: function (): number {
    return this.timestamp();
  },
  timestamp: function (val?: string | number | Date): number {
    let dateTime = val ? new Date(val) : new Date();

    return Math.floor(dateTime.getTime() / 1000);
  },
  seconds: function (val: number): number {
    return val;
  },
  minutes: function (val: number): number {
    return val * this.seconds(60);
  },
  hours: function (val: number): number {
    return val * this.minutes(60);
  },
  days: function (val: number): number {
    return val * this.hours(24);
  },
  weeks: function (val: number): number {
    return val * this.days(7);
  },
  years: function (val: number): number {
    return val * this.days(365);
  },
};

export class ERC20Factory {
  contractFactory: ContractFactory;

  constructor(_contractFactory: ContractFactory) {
    this.contractFactory = _contractFactory;
  }

  deploy = async (name: string, symbol: string, supply: BigNumberish) => {
    const token = await this.contractFactory.deploy(name, symbol, supply);
    await token.deployed();
    return token;
  };
}

export const getErc20Factory = async function () {
  const contractFactory = await ethers.getContractFactory("ERC20Mock");

  return new ERC20Factory(contractFactory);
};

export function* hdNodeGen(
  hdNode: HDNode,
  start = 0,
  end = 1000000,
  path = "m/44'/60'/0'/0/"
) {
  let count = 0;
  for (let i = start; i < end; i++) {
    count++;
    yield <[number, HDNode]>[i, hdNode.derivePath(`${path}${i}`)];
  }
  return count;
}

export type TreeData = {
  [index: string]: { amount: number };
};

export class BpMerkleTree {
  tree: MerkleTree;

  constructor(data: TreeData) {
    const leaves = Object.entries(data).map(([address, addrData]) => {
      return BpMerkleTree.hashLeaf(address, addrData.amount);
    });

    this.tree = new MerkleTree(leaves, keccak256, {
      sort: true,
    });
  }

  getProof(address: string, allowance: number): string[] {
    const leaf = BpMerkleTree.hashLeaf(address, allowance);
    return this.tree.getHexProof(leaf);
  }

  getRoot(): string {
    return this.tree.getHexRoot();
  }

  static hashLeaf(address: string, allowance: number): string {
    return ethers.utils.solidityKeccak256(
      ["address", "uint256"],
      [address, allowance]
    );
  }

  static fromFile(fileName: string): BpMerkleTree {
    const data: TreeData = JSON.parse(fs.readFileSync(fileName, "utf-8"));

    return new BpMerkleTree(data);
  }

  static fromObject(data: TreeData): BpMerkleTree {
    return new BpMerkleTree(data);
  }
}

