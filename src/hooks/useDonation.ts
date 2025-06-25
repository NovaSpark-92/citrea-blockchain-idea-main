import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, parseEther, formatEther } from 'viem';
import { defineChain } from 'viem';
import { useIdeas } from './useIdeas';

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

export function useDonation() {
  const { wallets } = useWallets();
  const { createDonation } = useIdeas();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendDonation = async (
    amount: string,
    recipientAddress: string,
    donorAddress: string,
    ideaId: string,
    implementationId?: string
  ) => {
    console.log('🎯 Starting donation process:', {
      amount,
      recipientAddress,
      donorAddress,
      ideaId,
      implementationId
    });

    if (!wallets || wallets.length === 0) {
      throw new Error('No wallets connected');
    }

    // Find the wallet that matches the donor address
    const currentWallet = wallets.find(wallet => 
      wallet.address.toLowerCase() === donorAddress.toLowerCase()
    );

    if (!currentWallet) {
      throw new Error('Could not find matching wallet');
    }

    setLoading(true);
    setError(null);

    try {
      // Get the EIP-1193 provider from the Privy wallet
      console.log('🔌 Getting Ethereum provider...');
      const provider = await currentWallet.getEthereumProvider();

      // Create a wallet client using viem
      console.log('🔧 Creating wallet client...');
      const walletClient = createWalletClient({
        account: currentWallet.address as `0x${string}`,
        chain: citreaTestnet,
        transport: custom(provider),
      });

      // Parse the amount to wei
      const amountWei = parseEther(amount);
      console.log('💰 Amount in wei:', amountWei.toString());

      // Send the transaction
      console.log('📤 Sending transaction...');
      const hash = await walletClient.sendTransaction({
        to: recipientAddress as `0x${string}`,
        value: amountWei,
      });

      console.log('✅ Transaction sent with hash:', hash);

      // Save the donation to the database
      console.log('💾 Saving donation to database...');
      await createDonation(
        ideaId,
        implementationId || null,
        donorAddress,
        recipientAddress,
        parseFloat(amount),
        hash
      );

      console.log('✅ Donation saved to database');
      return hash;

    } catch (err) {
      console.error('💥 Error sending donation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send donation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendDonation,
    loading,
    error,
  };
}