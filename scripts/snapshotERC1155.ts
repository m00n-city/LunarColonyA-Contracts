import hre from "hardhat";
import fs from "fs";
import { Command, InvalidArgumentError } from "commander";
import cliProgress from "cli-progress";
import { Contract, Event, EventFilter } from "ethers";
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
  .option("-e, --end-block <blockNumer>", "End block", myParseInt, 25459450)
  .option("-l, --limit <blockCount>", "Limit", myParseInt, 1000);

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
  contract: Contract;

  constructor(contract: Contract) {
    this.contract = contract;
  }

  addData = (from: string, to: string, value: number) => {
    if (!this.data[to]) {
      this.data[to] = { amount: 0 };
    }
    // if (!this.data[from]) {
    //   this.data[from] = { amount: 0 };
    // }
    this.data[to].amount += value;
    this.data[from].amount -= value;

    log.process(
      `${from} ${this.data[from].amount}, ${to} ${this.data[to].amount}, value: ${value}`
    );
  };

  process = (event: Event): void => {
    const eventLog = this.contract.interface.parseLog(event);

    const [from, to]: [string, string] = [
      eventLog.args?.[1],
      eventLog.args?.[2],
    ];
    if (eventLog.name === "TransferSingle") {
      const value: number = eventLog.args?.[4].toNumber();
      log.process("TransferSingle");
      this.addData(from, to, value);
    } else if (eventLog.name === "TransferBatch") {
      log.process("TransferBatch");
      const value: number = eventLog.args?.[4][0].toNumber();
      this.addData(from, to, value);
    } else {
      console.log("ERROR", event, eventLog);
    }
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
  const owners = new BoardingPassOwners(apollo2022);

  log.general(`Snapshot from ${startBlock} to ${endBlock}`);

  bar.start(endBlock - startBlock, 0);
  for (let curBlock = startBlock; curBlock < endBlock; curBlock += limit + 1) {
    const transferSingleFilter = apollo2022.filters.TransferSingle();
    const transferBatchFilter = apollo2022.filters.TransferBatch();

    const transferFilter = {
      address: apollo2022.address,
      topics: [
        transferSingleFilter.topics?.concat(transferBatchFilter.topics || []),
      ],
    };

    // const transferFilter = transferSingleFilter;

    const toBlock = curBlock + limit;
    const events = await retry(
      async (
        transferFilter: EventFilter,
        curBlock: number,
        toBlock: number
      ) => {
        return await apollo2022.queryFilter(transferFilter, curBlock, toBlock);
      },
      [transferFilter, curBlock, toBlock],
      {
        retriesMax: 10,
        interval: 300,
        onAttemptFail: (data: any) => {
          console.log("Error retrying", data);
        },
      }
    );

    for (const event of events) {
      owners.process(event);
    }

    log.blocks(`fromBlock: ${curBlock}, toBlock: ${toBlock}`);
    bar.increment(limit);
  }

  let fileName = `${opts.contractAddress}_orig.json`;
  log.general("Saving file", fileName);
  saveFile(fileName, owners.data);

  log.general("Prepare data for production usage");

  const newOwnersData: PassOwners = {};

  for (const [address, data] of Object.entries(owners.data)) {
    if (data.amount > 0) {
      const newData = { ...data };
      // each pass gives 2 mints
      newData.amount *= 2;
      newOwnersData[address] = newData;
    } else {
      log.process("skip:", address, data.amount);
    }
  }
  fileName = `${opts.contractAddress}.json`;

  log.general("Saving file", fileName);
  saveFile(fileName, newOwnersData);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
