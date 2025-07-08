import { Alchemy, Network } from 'alchemy-sdk';

const settings = {
  apiKey: 'o2IrCMmlU0iR_tKq_n6VFq0_qSUHNx0H',
  network: Network.ETH_MAINNET,
  maxRetries: 3,
};

export const alchemy = new Alchemy(settings);