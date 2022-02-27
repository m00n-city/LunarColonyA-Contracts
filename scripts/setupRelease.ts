import hre from "hardhat";
import { time } from "../utils";

// const start = time.now() - time.minutes(50 * 15);
const start = time.timestamp("2022-02-27T16:00:00");

const end = start + time.minutes(250 * 4);
const releaseAmount = 250;

async function main() {
  console.log(`start=${start}, end=${end}, amount=${releaseAmount}`)
  await hre.run("setupRelease", { start, end, amount: releaseAmount });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
