import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
  network,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  /*
    address _beneficiary,
    address _royaltyAddr,
    uint256 _royaltyPct,
    address _proxyRegistryAddress,
    string memory _preRevealURI
  */
  let args = [];
  if (network.name === "mainnet") {
    //TODO add prereveal url
    args = [deployer, deployer, 5, "0xa5409ec958C83C3f309868babACA7c86DCB077c1", ""]
  } else if (network.name === "rinkeby") {
    args = [
      deployer,
      deployer,
      5,
      "0xF57B2c51dED3A29e6891aba85459d600256Cf317",
      "ipfs://QmY5DRuUTG5PbKjmiar6hJnFdKp6PmxvPMXfYEBweHGnDS",
    ];
  } else if (network.tags.local) {
    args = [deployer, deployer, 5, "0xF57B2c51dED3A29e6891aba85459d600256Cf317", ""]
  } else {
    throw 'Invalid network'
  }

  log(args)
  await deploy("LCAlpha", {
    from: deployer,
    args,
    log: true,
  });
};

export default func;

func.tags = ["LCA", "LCAlpha"];
func.dependencies = [];
// func.skip = async () => true;
