// Minimal ERC-20 ABI for approve/allowance/decimals/symbol/balanceOf
export const ERC20_ABI = [
  { type: "function", name: "name",    stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol",  stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals",stateMutability: "view", inputs: [], outputs: [{ type: "uint8"  }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve",   stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];