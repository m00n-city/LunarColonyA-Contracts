import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { time } from "../utils";
import { config } from "../config";
import { getErc20Factory } from "../utils";
import { parseEther } from "ethers/lib/utils";
import { hrtime } from "process";

const func: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
  network,
  run,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  let wethAddr: string = config.network[network.name]?.WETH?.address;

  if (network.tags.local) {
    const erc20Factory = await getErc20Factory();
    const WETH = await erc20Factory.deploy(
      "Wrapped ETH",
      "WETH",
      parseEther("10000")
    );
    wethAddr = WETH.address;
  }

  if (!wethAddr) {
    console.log("Please set WETH.address in config.ts");
    return;
  }

  log(`Deploying Apollo2022(
    weth=${wethAddr}
  )`);

  await deploy("Apollo2022", {
    from: deployer,
    args: [config.apollo.baseURI, wethAddr],
    log: true,
  });

  if (network.tags.local) {
    const start = time.now() + time.hours(1);
    const end = start + time.days(3);
    const releaseAmount = 500;

    await run("setupRelease", { start, end, amount: releaseAmount });
  }
};

export default func;

func.tags = ["Apollo2022"];
func.dependencies = [];
