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

    let gasPrice = await apollo2022.provider.getGasPrice();
    console.log("gas price", ethers.utils.formatUnits(gasPrice, "gwei"));
    gasPrice = gasPrice.mul(2);
    console.log("gas price * 2", ethers.utils.formatUnits(gasPrice, "gwei"));

    const options = { gasPrice };
    const tx = await apollo2022.setupRelease(start, end, amount, options);
    console.log(tx);

    await tx.wait();
  });

task("setURI", "Sets new base uri")
  .addParam("uri", "New URI")
  .setAction(async function ({ uri }, { ethers }) {
    const apollo2022 = await ethers.getContract("Apollo2022");

    console.log(`Apollo2022.setURI(
      uri=${uri}
    )`);

    await apollo2022.setURI(uri);
  });

task("reserveTickets", "Reserves tickets for giveaways")
  .addParam("address", "Receiver address")
  .addParam("amount", "Mint amount", undefined, types.int)
  .setAction(async function ({ address, amount }, { ethers }) {
    const apollo2022 = await ethers.getContract("Apollo2022");
    console.log(`Apollo2022.reserveTickets(
      address=${address},
      amount=${amount}
    )`);
    const tx = await apollo2022.reserveTickets(address, amount);
    console.log(tx);

    await tx.wait();
  });

task("sendERC20", "Sends ERC20 token to all unnamed accounts")
  .addParam("address", "Token address")
  .addOptionalParam("amount", "Transfer amount", "100")
  .setAction(async function (
    { address, amount },
    { ethers, getUnnamedAccounts }
  ) {
    const erc20 = await ethers.getContractAt("ERC20Mock", address);

    const unnamedAccs = await getUnnamedAccounts();
    for (const account of unnamedAccs) {
      console.log(`Sending ${amount} to ${account}`);
      await erc20.transfer(account, ethers.utils.parseEther(amount));
    }
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
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
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
      mining: {
        auto: false,
        interval: [1000, 3000],
      },
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
      url: `https://rpc-mainnet.maticvigil.com/v1/${process.env.MATICVIGIL_API_KEY}`,
      accounts,
      chainId: 137,
      tags: ["l2"],
    },
    "matic-mumbai": {
      url: `https://rpc-mumbai.maticvigil.com/v1/${process.env.MATICVIGIL_API_KEY}`,
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
    // dao: {
    //   default: 1, // here this will by default take the second account as team (so in the test this will be a different account than the deployer)
    //   // 1: "", // on the mainnet the team could be a multi sig
    //   // 4: "", // on rinkeby
    // },
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
