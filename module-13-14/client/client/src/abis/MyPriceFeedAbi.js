export const MyPriceFeedAbi = [
  {
    type: "function",
    name: "getDataFeed",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "int256" }, { type: "uint8" }],
  },
];
