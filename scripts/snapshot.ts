import hre from "hardhat";
import fs from "fs";
import { Command, Option } from "commander";
import cliProgress from "cli-progress";

const ethers = hre.ethers;

const program = new Command();
program.version("0.0.1");
program.option(
  "-a, --contract-address <name>",
  "Contract address",
  "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
);

program.parse();
const opts = program.opts();

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

interface PassOwners {
  [index: string]: {
    amount: number;
    passIds: number[];
  };
}

async function main() {
  const apollo2022 = await ethers.getContractAt(
    "Apollo2022",
    opts.contractAddress
  );
  const supply = await apollo2022.totalSupply();
  const owners: PassOwners = {};

  bar.start(supply, 0);
  for (let i = 0; i < supply; i++) {
    const address: string = await apollo2022.ownerOf(i);
    if (!owners[address]) {
      owners[address] = { amount: 1, passIds: [i] };
    } else {
      owners[address].amount++;
      owners[address].passIds.push(i);
    }
    bar.increment(1);
  }

  fs.writeFileSync(opts.contractAddress, JSON.stringify(owners));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
