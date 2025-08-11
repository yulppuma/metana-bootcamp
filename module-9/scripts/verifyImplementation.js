
//ERC20 Proxy
const ERC20ImplAddress = await upgrades.erc1967.getImplementationAddress("0xd5cA7d8707DCda5cAe0700BA106d6f75C9EAafd8");
console.log("ERC20 Implementation at: ", ERC20ImplAddress);

const ERC721ImplAddress = await upgrades.erc1967.getImplementationAddress("0xdAeaeBe4fAC5eA42946D3A0E7631436f2C21ADb6");
console.log("ERC721 Implementation at: ", ERC721ImplAddress);

const stakeImplAddress = await upgrades.erc1967.getImplementationAddress("0xeC824b4995aA8ed48cb19f6397C936b79e535616");
console.log("Stake Implementation at: ", stakeImplAddress);