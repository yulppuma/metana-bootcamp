import { Alchemy, Network } from 'alchemy-sdk';

const settings = {
  apiKey: 'o2IrCMmlU0iR_tKq_n6VFq0_qSUHNx0H',
  network: Network.ETH_MAINNET,
  maxRetries: 3,
};
const wsSettings = {
  apiKey: 'o2IrCMmlU0iR_tKq_n6VFq0_qSUHNx0H',
  network: Network.ETH_MAINNET,
  ws: true,
  maxRetries: 3,
};

export const alchemy = new Alchemy(settings);
export const alchemyWs = new Alchemy(wsSettings);