import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
}: HardhatRuntimeEnvironment) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // two days in seconds
  const delay = 60 * 60 * 24 * 2;

  await deploy("LCAlpha", {
    from: deployer,
    args: ['Lunar Colony Alpha', 'LCA'],
    log: true,
  });
};

export default func;

func.tags = ["LCA", "LCAlpha"];
func.dependencies = [];