export interface IConfig {
  network: INetwork;
  apollo: { baseURI: string };
}

export interface INetwork {
  [network: string]: any;
}

export const config: IConfig = {
  network: {
    matic: {
      WETH: {
        address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      },
    },
    "matic-mumbai": {
      WETH: {
        address: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
      },
    },
    rinkeby: {
      WETH: {
        address: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
      },
    },
  },
  apollo: {
    baseURI: "ipfs://QmeSUfNKCu6bnPYF3MiFfSCcbaUoxcau8Bw3aBToAKFxZv",
  },
};
