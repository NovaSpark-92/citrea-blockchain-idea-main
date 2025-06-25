import React, { useState } from 'react';
import { X, Bitcoin, Wallet, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useDonation } from '../hooks/useDonation';
import { useWalletBalance } from '../hooks/useWalletBalance';
import type { IdeaWithDetails } from '../hooks/useIdeas';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: IdeaWithDetails;
  implementation?: any;
  userWalletAddress: string;
  onSuccess: () => void;
}

export function DonationModal({ 
  isOpen, 
  onClose, 
  idea, 
  implementation, 
  userWalletAddress,
  onSuccess 
}: DonationModalProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'confirming' | 'success' | 'error'>('input');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { sendDonation, loading } = useDonation();
  const { balance, refetch: refetchBalance } = useWalletBalance();

  const recipientAddress = implementation?.citrea_address || idea.creator_wallet_address;
  const donationTarget = implementation ? `${implementation.label} implementation` : 'idea';

  const handleClose = () => {
    if (!loading) {
      setAmount('');
      setStep('input');
      setTransactionHash(null);
      setErrorMessage(null);
      onClose();
    }
  };

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    if (balance && parseFloat(amount) > parseFloat(balance)) {
      setErrorMessage('Insufficient balance');
      return;
    }

    try {
      setStep('confirming');
      setErrorMessage(null);

      const hash = await sendDonation(
        amount,
        recipientAddress,
        userWalletAddress,
        idea.id,
        implementation?.id
      );

      setTransactionHash(hash);
      setStep('success');
      
      // Refresh balance and trigger success callback
      setTimeout(() => {
        refetchBalance();
        onSuccess();
      }, 1000);

    } catch (error) {
      console.error('Donation failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      setStep('error');
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const quickAmounts = ['0.001', '0.01', '0.1', '1.0'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Bitcoin className="h-6 w-6 text-orange-500" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Donate to {donationTarget}
              </h3>
              <p className="text-sm text-gray-600">{idea.title}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Recipient Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Recipient:</span>
                  <span className="text-sm text-gray-600">
                    {formatWalletAddress(recipientAddress)}
                  </span>
                </div>
                {implementation && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Implementation:</span>
                    <span className="text-sm text-indigo-600">{implementation.label}</span>
                  </div>
                )}
              </div>

              {/* Balance Display */}
              {balance && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Your Balance:</span>
                  <div className="flex items-center gap-1 text-orange-600 font-medium">
                    <Wallet className="h-4 w-4" />
                    <span>{balance} cBTC</span>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (cBTC)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-mono"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick amounts:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(quickAmount)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      {quickAmount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDonate}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Donate {amount || '0'} cBTC
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'confirming' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Confirming Transaction
              </h4>
              <p className="text-gray-600">
                Please confirm the transaction in your wallet...
              </p>
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">
                  <div>Amount: <span className="font-medium">{amount} cBTC</span></div>
                  <div>To: <span className="font-mono">{formatWalletAddress(recipientAddress)}</span></div>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Donation Successful!
              </h4>
              <p className="text-gray-600 mb-4">
                Your donation of {amount} cBTC has been sent successfully.
              </p>
              {transactionHash && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-2">Transaction Hash:</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded border">
                      {formatWalletAddress(transactionHash)}
                    </span>
                    <a
                      href={`https://explorer.testnet.citrea.xyz/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
              <button
                onClick={handleClose}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Close
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Transaction Failed
              </h4>
              <p className="text-red-600 mb-4">
                {errorMessage || 'An error occurred while processing your donation.'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep('input')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}