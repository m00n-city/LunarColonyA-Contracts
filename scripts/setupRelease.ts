import hre from "hardhat";
import { time } from "../utils";

const start = time.now();
const end = start + time.hours(5);
const releaseAmount = 100;

async function main() {
  await hre.run("setupRelease", { start, end, amount: releaseAmount });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
