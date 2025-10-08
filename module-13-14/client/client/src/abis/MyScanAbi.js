export const MyScanAbi = [
  {
    type: "event",
    name: "PaymentStamped",
    inputs: [
      { name: "payer", type: "address", indexed: true },
      { name: "payee", type: "address", indexed: true },
      { name: "asset", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "memo", type: "string", indexed: false },
      { name: "feed", type: "address", indexed: false },
      { name: "price", type: "int256", indexed: false },
      { name: "priceDecimals", type: "uint8", indexed: false },
      { name: "updatedAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "sendEth",
    inputs: [
      { name: "to", type: "address" },
      { name: "feed", type: "address" },
      { name: "memo", type: "string" },
    ],
    outputs: [],
  },
];