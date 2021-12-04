export interface IConfig {
  network: INetwork;
  apollo: { baseURI: string };
}

export interface INetwork {
  [network: string]: any;
}

export const config: IConfig = {
  network: {
    "matic-mumbai": {
      WETH: {
        address: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
      },
    },
  },
  apollo: {
    baseURI: "ipfs://QmTFdg4WmLyidFmftZ48gD5PtKzVJrAg2kG3WpNas6CZp9",
  },
};
