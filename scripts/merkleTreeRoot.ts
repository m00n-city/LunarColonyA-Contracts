import hre from "hardhat";
import { Command, Option, InvalidArgumentError } from "commander";
import cliProgress from "cli-progress";
import debug from "debug";
import MerkleTree from "merkletreejs";
import { BpMerkleTree } from "../utils";

const log = {
  general: debug("merkleTreeRoot"),
};

const program = new Command();
program.version("0.0.1");

program.option(
  "-s, --snapshot-file <name>",
  "Snapshot data file",
  `${__dirname}/../bpass_data/0x54E8E8338C475086912Bb1F112D8Ba72bB018D50`
);

program.parse();
const opts = program.opts();

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function main() {
  const tree = BpMerkleTree.fromFile(opts.snapshotFile);
  const root = tree.getRoot();
  console.log(root);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
