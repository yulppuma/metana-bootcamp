import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const CHAINS = [sepolia];

const SEPOLIA_RPC = import.meta.env.VITE_SEPOLIA_RPC || undefined;

export const TRANSPORTS = { [sepolia.id]: http() };

export const CONTRACT_ADDRESSES = {
  [sepolia.id]: {
    MyScan: "0xbfDB8a865b1e6fd9a3594312A85eB0503E24E203",
    MyPriceFeed: "0xb34DFd4B28d4F02596Ab93B577D11Ad47B3B5b5B",
  },
};
