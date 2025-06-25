import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, custom, formatEther } from 'viem';
import { defineChain } from 'viem';

// Define Citrea Testnet chain
const citreaTestnet = defineChain({
  id: 5115,
  name: 'Citrea Testnet',
  nativeCurrency: {
    name: 'Citrea Bitcoin',
    symbol: 'cBTC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.citrea.xyz'],
    },
    public: {
      http: ['https://rpc.testnet.citrea.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'CitreaScan',
      url: 'https://explorer.testnet.citrea.xyz',
    },
  },
  testnet: true,
});

export function useWalletBalance() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    console.log('🔄 fetchBalance called - authenticated:', authenticated);
    console.log('🔄 Available wallets:', wallets?.length || 0);
    
    if (!authenticated || !user?.wallet?.address || !wallets || wallets.length === 0) {
      console.log('❌ Not authenticated, no wallet address, or no wallets available');
      console.log('❌ Details:', { 
        authenticated, 
        hasWalletAddress: !!user?.wallet?.address,
        walletsCount: wallets?.length || 0 
      });
      setBalance(null);
      setError(null);
      return;
    }

    // Find the wallet that matches the current user's wallet address
    const currentWallet = wallets.find(wallet => 
      wallet.address.toLowerCase() === user.wallet.address.toLowerCase()
    );

    if (!currentWallet) {
      console.log('❌ Could not find matching wallet in wallets array');
      console.log('❌ Looking for:', user.wallet.address);
      console.log('❌ Available wallets:', wallets.map(w => ({ address: w.address, type: w.walletClientType })));
      setError('Wallet not found in connected wallets');
      return;
    }

    console.log('🚀 Starting balance fetch for wallet:', {
      address: currentWallet.address,
      type: currentWallet.walletClientType,
      chainId: currentWallet.chainId
    });

    setLoading(true);
    setError(null);

    try {
      // Get the EIP-1193 provider from the Privy wallet instance
      console.log('🔌 Getting Ethereum provider from wallet...');
      const provider = await currentWallet.getEthereumProvider();
      console.log('✅ Got Ethereum provider from Privy wallet');

      // Create a viem public client using the provider
      console.log('🔧 Creating viem public client...');
      const publicClient = createPublicClient({
        chain: citreaTestnet,
        transport: custom(provider),
      });
      console.log('✅ Created viem public client');

      // Get the balance using viem
      console.log('💰 Fetching balance from blockchain...');
      const balanceWei = await publicClient.getBalance({
        address: currentWallet.address as `0x${string}`,
      });

      console.log('💰 Raw balance (wei):', balanceWei.toString());

      // Convert from wei to ether (cBTC)
      const balanceEther = formatEther(balanceWei);
      console.log('💰 Formatted balance (cBTC):', balanceEther);

      // Format to 4 decimal places
      const formattedBalance = parseFloat(balanceEther).toFixed(4);
      console.log('💰 Final formatted balance:', formattedBalance);

      setBalance(formattedBalance);
      setError(null);

    } catch (err) {
      console.error('💥 Error fetching balance:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      setBalance('0.0000'); // Default to 0 on error
    } finally {
      setLoading(false);
      console.log('🏁 Balance fetch completed');
    }
  }, [authenticated, user?.wallet?.address, wallets]);

  // Auto-fetch on mount and when wallet changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - authenticated:', authenticated, 'address:', user?.wallet?.address, 'wallets:', wallets?.length);
    
    if (authenticated && user?.wallet?.address && wallets && wallets.length > 0) {
      console.log('🚀 Auto-fetching balance due to wallet change');
      fetchBalance();
    } else {
      console.log('🔄 Clearing balance - not ready yet');
      setBalance(null);
      setError(null);
    }
  }, [authenticated, user?.wallet?.address, wallets, fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance, // This is the function called by the refresh button
  };
}