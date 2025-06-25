import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { defineChain } from 'viem';
import { baseSepolia } from 'viem/chains';
import App from './App.tsx';
import './index.css';

// Define Citrea Testnet custom chain using defineChain from viem
const citreaTestnet = defineChain({
  id: 5115, // Chain ID
  name: 'Citrea Testnet', // Chain Name
  nativeCurrency: {
    name: 'Citrea Bitcoin', // A descriptive name for the currency
    symbol: 'cBTC', // Currency Symbol
    decimals: 18, // Standard for EVM-compatible chains
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.citrea.xyz'], // RPC Endpoint
    },
    public: {
      http: ['https://rpc.testnet.citrea.xyz'], // Public RPC endpoint
    },
  },
  blockExplorers: {
    default: {
      name: 'CitreaScan', // Explorer name
      url: 'https://explorer.testnet.citrea.xyz', // Explorer URL
    },
  },
  testnet: true, // Mark as testnet
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId="clwa1hbdf0745co65ga4envg2"
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#4F46E5',
        },
        loginMethods: ['email', 'wallet'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // Add Citrea Testnet as custom chain
        customChains: [citreaTestnet],
        // Include both Citrea Testnet and Base Sepolia in supported chains
        supportedChains: [citreaTestnet, baseSepolia],
        // Keep Citrea Testnet as the default chain
        defaultChain: citreaTestnet,
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>
);