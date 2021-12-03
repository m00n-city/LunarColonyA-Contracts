import "dotenv/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
// import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import "solidity-coverage";

import { task, types } from "hardhat/config";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("setupRelease", "Setups a new LCA Boarding Passes release")
  .addParam("start", "Release start", undefined, types.int)
  .addParam("end", "Release end", undefined, types.int)
  .addParam("amount", "Release amount", undefined, types.int)
  .setAction(async function ({ start, end, amount }, { ethers }) {
    const apollo2022 = await ethers.getContract("Apollo2022");

    console.log(`Apollo2022.setupRelease(
      start=${start},
      end=${end},
      releaseMaxSupply=${amount}
    )`);
    await apollo2022.setupRelease(start, end, amount);
  });

const accounts = {
  mnemonic: process.env.MNEMONIC,
};

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    mainnet: {
      url: "https://cloudflare-eth.com",
      accounts,
      chainId: 1,
      tags: ["production"],
    },
    localhost: {
      accounts,
      live: false,
      tags: ["local"],
    },
    hardhat: {
      accounts,
      forking: {
        enabled: process.env.HARDHAT_NETWORK_FORKING === "true",
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: Number(process.env.HARDHAT_NETWORK_BLOCK),
      },
      live: false,
      tags: ["local"],
      chainId: 1337,
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 3,
      tags: ["staging"],
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 4,
      tags: ["staging"],
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 5,
      tags: ["staging"],
    },
    kovan: {
      url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts,
      chainId: 42,
    },
    matic: {
      url: "https://rpc-mainnet.maticvigil.com",
      accounts,
      chainId: 137,
      tags: ["l2"],
    },
    "matic-mumbai": {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts,
      chainId: 80001,
      tags: ["staging", "l2"],
    },
  },

  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      // 1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
    },
    dao: {
      default: 1, // here this will by default take the second account as team (so in the test this will be a different account than the deployer)
      // 1: "", // on the mainnet the team could be a multi sig
      // 4: "", // on rinkeby
    },
  },

  gasReporter: {
    currency: "USD",
    enabled: process.env.GAS_REPORTER === "true",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  mocha: {
    timeout: 70000,
  },
};
