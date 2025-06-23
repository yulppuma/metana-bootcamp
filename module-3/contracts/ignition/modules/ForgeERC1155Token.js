// ignition/modules/ForgeERC1155Token.js

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ForgeERC1155TokenModule", (m) => {
  // Deploy ERC1155Token with your constructor arg if needed
  const erc1155Token = m.contract("ERC1155Token", []);

  // Deploy ForgeERC1155Token with the ERC1155Token address
  const forgeERC1155 = m.contract("ForgeERC1155Token", [erc1155Token]);

  return { erc1155Token, forgeERC1155 };
});