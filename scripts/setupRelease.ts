import hre from "hardhat";
import { time } from "../utils";

const start = time.now() + time.hours(1);
const end = start + time.days(3);
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
