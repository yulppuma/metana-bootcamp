require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.30",
  networks: {
    hardhat: {
      accounts: {
        count: 1002,
      },
    },
  },
};
