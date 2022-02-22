import hre from "hardhat";
import { time } from "../utils";

const start = time.now() - time.minutes(50 * 15);
// const start = time.timestamp("2022-02-04T19:00:00");

const end = start + time.minutes(500 * 15);
const releaseAmount = 500;

async function main() {
  await hre.run("setupRelease", { start, end, amount: releaseAmount });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
