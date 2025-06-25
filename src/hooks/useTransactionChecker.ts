import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatEther } from 'viem';

interface CitreaTransactionResponse {
  timestamp: string;
  fee: {
    type: string;
    value: string;
  };
  gas_limit: string;
  block: number;
  status: string;
  confirmations: number;
  result: 'success' | 'error' | string;
  hash: string;
  value: string;
  from: {
    hash: string;
  };
  to: {
    hash: string;
  };
}

export function useTransactionChecker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTransactionStatus = async (transactionHash: string) => {
    try {
      console.log('🔍 Checking transaction status for:', transactionHash);
      
      const response = await fetch(`https://explorer.testnet.citrea.xyz/api/v2/transactions/${transactionHash}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: CitreaTransactionResponse = await response.json();
      console.log('📊 Transaction data received:', data);

      // Parse the value from wei to ether
      const valueInEther = formatEther(BigInt(data.value));
      const valueAsNumber = parseFloat(valueInEther);

      // Determine status based on result
      let status: 'pending' | 'confirmed' | 'failed';
      if (data.result === 'success') {
        status = 'confirmed';
      } else if (data.result === 'error') {
        status = 'failed';
      } else {
        status = 'pending';
      }

      console.log('💰 Parsed transaction:', {
        hash: data.hash,
        status,
        value: valueAsNumber,
        confirmations: data.confirmations
      });

      return {
        hash: data.hash,
        status,
        value: valueAsNumber,
        confirmations: data.confirmations,
        block: data.block,
        timestamp: data.timestamp
      };

    } catch (err) {
      console.error('❌ Error checking transaction:', err);
      throw err;
    }
  };

  const updateDonationStatus = async (transactionHash: string, status: string, actualValue?: number) => {
    try {
      console.log('💾 Updating donation status:', { transactionHash, status, actualValue });

      const updateData: any = { status };
      
      // Only update amount if there's a significant difference (more than 0.0001 cBTC)
      if (actualValue !== undefined) {
        const { data: currentDonation, error: fetchError } = await supabase
          .from('donations')
          .select('amount')
          .eq('transaction_hash', transactionHash)
          .single();

        if (fetchError) {
          console.error('Error fetching current donation:', fetchError);
        } else if (currentDonation) {
          const currentAmount = Number(currentDonation.amount);
          const difference = Math.abs(currentAmount - actualValue);
          
          if (difference > 0.0001) {
            console.log('💰 Updating amount due to significant difference:', {
              current: currentAmount,
              actual: actualValue,
              difference
            });
            updateData.amount = actualValue;
          }
        }
      }

      const { error } = await supabase
        .from('donations')
        .update(updateData)
        .eq('transaction_hash', transactionHash);

      if (error) {
        throw error;
      }

      console.log('✅ Donation status updated successfully');

    } catch (err) {
      console.error('❌ Error updating donation status:', err);
      throw err;
    }
  };

  const refreshTransactionStatuses = async (transactionHashes: string[]) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Refreshing transaction statuses for:', transactionHashes.length, 'transactions');

      const results = [];
      
      for (const hash of transactionHashes) {
        try {
          const txData = await checkTransactionStatus(hash);
          await updateDonationStatus(hash, txData.status, txData.value);
          results.push({ hash, success: true, data: txData });
        } catch (err) {
          console.error(`❌ Failed to update transaction ${hash}:`, err);
          results.push({ hash, success: false, error: err });
        }
        
        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Transaction refresh completed:', results);
      return results;

    } catch (err) {
      console.error('💥 Error during transaction refresh:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh transactions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    checkTransactionStatus,
    updateDonationStatus,
    refreshTransactionStatuses,
    loading,
    error,
  };
}