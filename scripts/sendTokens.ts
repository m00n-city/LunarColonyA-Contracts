import "dotenv/config";
import hre from "hardhat";
import { parse } from "csv-parse";
import fs from "fs";
import { Command } from "commander";

const program = new Command();
program.version("0.0.1");
program.requiredOption("-f, --file <name>", "CSV file in format 'id,address'");
program.option(
  "-s, --state-file <name>",
  "CSV file in format 'id,address'",
  "/tmp/sendTokens.json"
);

program.parse();
const opts = program.opts();

const ethers = hre.ethers;
const utils = ethers.utils;

const state = JSON.parse(fs.readFileSync(opts.stateFile).toString());
console.log(state);

async function main() {
  const apollo2022 = await ethers.getContract("Apollo2022");
  const { deployer } = await hre.getNamedAccounts();

  const ensProvider = ethers.providers.getDefaultProvider("homestead", {
    etherscan: process.env.ETHERSCAN_API_KEY,
    alchemy: process.env.ALCHEMY_API_KEY,
    infura: process.env.INFURA_API_KEY,
  });

  // const ensProvider = new ethers.providers.AlchemyProvider(
  //   "homestead",
  //   process.env.ALCHEMY_API_KEY
  // );

  const parser = fs.createReadStream(opts.file).pipe(
    parse({
      columns: ["address", "amount"],
    })
  );

  const deployerAmount = (
    await apollo2022.ticketBalanceOf(deployer)
  ).toNumber();
  console.log("Deployer tickets amount", deployerAmount);

  for await (const record of parser) {
    let address: string = record.address.trim();
    const amount: string = record.amount;

    try {
      if (address.includes(".eth")) {
        const resolvedAddr = await ensProvider.resolveName(address);

        if (!resolvedAddr) {
          console.log("Can not resolve addr:", address, resolvedAddr);
          continue;
        }
        address = resolvedAddr;
      }
      // const curAmount = (await apollo2022.ticketBalanceOf(address)).toNumber();
      // console.log(`${address}, curAmount=${curAmount}, amount=${amount}`);

      if (!state[address]) {
        const gasPrice = await apollo2022.provider.getGasPrice();
        console.log("gas price", utils.formatUnits(gasPrice, "gwei"));

        const options = { gasPrice };
        await apollo2022.safeTransferFrom(
          deployer,
          address,
          0,
          amount,
          "0x",
          options
        );

        console.log("sending", deployer, "->", address, amount);
        state[address] = true;
      } else {
        console.log("skipping", address, amount);
      }
    } catch (e) {
      console.log(address);
      console.log(e);
    }
  }
}

function onExit(exitCode: number) {
  fs.copyFileSync(opts.stateFile, opts.stateFile + ".old");
  fs.writeFileSync(opts.stateFile, JSON.stringify(state, undefined, 2));
  process.exit(exitCode);
}

process.on("SIGINT", () => {
  console.log("SIGINT");
  onExit(0);
});

main()
  .then(() => {
    console.log("All tokens were successfully sent!");
    onExit(0);
  })
  .catch((error) => {
    console.error(error);
    onExit(1);
  });
