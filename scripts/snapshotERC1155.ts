import hre from "hardhat";
import fs from "fs";
import { Command, InvalidArgumentError } from "commander";
import cliProgress from "cli-progress";
import { Event } from "ethers";
import retry from "async-await-retry";
import debug from "debug";

const ethers = hre.ethers;
const log = {
  general: debug("snapshot"),
  blocks: debug("snapshot:blocks"),
  process: debug("snapshot:process"),
  retry: debug("snapshot:retry"),
};

const program = new Command();
program.version("0.0.1");

function myParseInt(value: string, _dummyPrevious: any) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError("Not a number.");
  }
  return parsedValue;
}

program
  .option(
    "-a, --contract-address <name>",
    "Contract address",
    "0x54E8E8338C475086912Bb1F112D8Ba72bB018D50"
  )
  .option("-s, --start-block <blockNumer>", "Start block", myParseInt, 22292323)
  .option("-e, --end-block <blockNumer>", "End block", myParseInt, 25325091)
  .option("-l, --limit <blockCount>", "Limit", myParseInt, 1000)
  .option("-r, --remove-zero", "Remove zero amount entries");

program.parse();
const opts = program.opts();

const startBlock: number = opts.startBlock;
const endBlock: number = opts.endBlock;
const limit: number = opts.limit;

log.general("command line args = ", opts);

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

interface PassOwners {
  [index: string]: {
    amount: number;
  };
}

class BoardingPassOwners {
  data: PassOwners = {
    "0x0000000000000000000000000000000000000000": { amount: 10000 },
  };

  process = (event: Event): void => {
    const [from, to]: [string, string] = [event.args?.[1], event.args?.[2]];
    const value: number = event.args?.[4].toNumber();

    if (!this.data[to]) {
      this.data[to] = { amount: 0 };
    }

    this.data[to].amount += value;
    this.data[from].amount -= value;

    log.process(
      `${from} ${this.data[from].amount}, ${to} ${this.data[to].amount}, value: ${value}`
    );
  };
}

function saveFile(file: string, data: PassOwners) {
  fs.writeFileSync(file, JSON.stringify(data, undefined, 2));
}

async function main() {
  const apollo2022 = await ethers.getContractAt(
    "Apollo2022",
    opts.contractAddress
  );
  const supply = await apollo2022.totalTicketSupply();
  const owners = new BoardingPassOwners();

  log.general(`Snapshot from ${startBlock} to ${endBlock}`);

  bar.start(endBlock - startBlock, 0);
  for (let curBlock = startBlock; curBlock < endBlock; curBlock += limit + 1) {
    const transferFilter = apollo2022.filters.TransferSingle();

    const toBlock = curBlock + limit;
    const events = await apollo2022.queryFilter(
      transferFilter,
      curBlock,
      toBlock
    );

    for (const event of events) {
      retry(owners.process, [event], {
        retriesMax: 10,
        interval: 300,
        onAttemptFail: (data: any) => {
          log.retry("Error retrying", data);
        },
      });
    }

    log.blocks(`fromBlock: ${curBlock}, toBlock: ${toBlock}`);
    bar.increment(limit);
  }

  const fileName = `${opts.contractAddress}.json`;
  log.general("Saving file", fileName);
  saveFile(fileName, owners.data);

  if (opts.removeZero) {
    log.general("Remove lines with zero amount");

    const newOwnersData: PassOwners = {};

    for (const [address, data] of Object.entries(owners.data)) {
      if (data.amount > 0) {
        newOwnersData[address] = data;
      } else {
        log.process("skip:", address, data.amount);
      }
    }
    const fileName = `${opts.contractAddress}_no0.json`;
    saveFile(fileName, newOwnersData);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
