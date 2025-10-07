// src/utils/tokenList.js
export const TOKENS_BY_CHAIN = {
  // Sepolia
  11155111: [
    // Native ETH is treated specially (use "ETH" sentinel)
    { symbol: "ETH", address: "ETH", decimals: 18 },

    // Chainlink LINK on Sepolia (faucet token)
    { symbol: "LINK", address: "0x779877A7B0D9E8603169DdbD7836e478b4624789" },

    // TODO: replace with YOUR actual DAI + USDT contract addresses on Sepolia
    { symbol: "DAI",  address: "0xYOUR_DAI_ADDRESS",  /* decimals will be fetched */ },
    { symbol: "USDT", address: "0xYOUR_USDT_ADDRESS", /* decimals will be fetched */ },
  ],
};
