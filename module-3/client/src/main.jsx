import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ForgeERC1155TokenProvider } from './context/ForgeERC1155TokenContext';

import '@rainbow-me/rainbowkit/styles.css';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getDefaultWallets, connectorsForWallets , RainbowKitProvider} from '@rainbow-me/rainbowkit';
import { metaMaskWallet, coinbaseWallet, walletConnectWallet} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
const chains = [sepolia];
const projectId = '957c573f4053485e517f52afcdd54506';
/*const {connectors} = connectorsForWallets([
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'ForgeERC1155Token',
    projectId: projectId,
  }
);*/
const { connectors } = getDefaultWallets({
  appName: 'ForgeERC1155Token',
  projectId: projectId,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  chains,
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/o2IrCMmlU0iR_tKq_n6VFq0_qSUHNx0H'),
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>
          <ForgeERC1155TokenProvider>
            <App />
          </ForgeERC1155TokenProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
)
