import hre from "hardhat";
import { time } from "../utils";

const start = time.now() + time.minutes(2);
const end = start + time.minutes(10);
const releaseAmount = 3;

async function main() {
  await hre.run("setupRelease", { start, end, amount: releaseAmount });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
