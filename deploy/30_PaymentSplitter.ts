import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, getUnnamedAccounts } from "hardhat";

const func: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
  network,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer, team, dao, rewardsFund } = await getNamedAccounts();
  let [og69addr] = await getUnnamedAccounts();

  if (network.name === "mainnet") {
    const res = await ethers.provider.resolveName("OG69.eth");
    if (res === null) {
      console.log("Can not resolve OG69.eth");
      return false;
    }

    og69addr = res;
  }

  let args = [
    [team, dao, rewardsFund, og69addr],
    [45, 30, 15, 10],
  ];

  log(args);
  await deploy("PaymentSplitter", {
    from: deployer,
    args,
    log: true,
  });
};

export default func;

func.tags = ["PaymentSplitter"];
func.dependencies = [];
func.skip = async () => true;
