import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { 
  Lightbulb, 
  Plus, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle,
  Bitcoin,
  Link as LinkIcon,
  User,
  Calendar,
  DollarSign,
  Users,
  RefreshCw,
  Wallet,
  Heart
} from 'lucide-react';
import { useIdeas, type IdeaWithDetails } from './hooks/useIdeas';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useWalletBalance } from './hooks/useWalletBalance';
import { useTransactionChecker } from './hooks/useTransactionChecker';
import { DonationModal } from './components/DonationModal';

type Idea = IdeaWithDetails;

function App() {
  const { login, logout, authenticated, user } = usePrivy();
  const { userProfile, loading: profileLoading, error: profileError } = useSupabaseAuth();
  const { balance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useWalletBalance();
  const { ideas, loading, error, createIdea, updateIdea, deleteIdea, createImplementation, deleteImplementation, refetch: refetchIdeas } = useIdeas();
  const { refreshTransactionStatuses, loading: txLoading, error: txError } = useTransactionChecker();
  
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDescription, setNewIdeaDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [addingImplementation, setAddingImplementation] = useState<string | null>(null);
  const [newImplUrl, setNewImplUrl] = useState('');
  const [newImplLabel, setNewImplLabel] = useState('');
  const [newImplDescription, setNewImplDescription] = useState('');
  const [newImplCitreaAddress, setNewImplCitreaAddress] = useState('');
  const [showDonorsModal, setShowDonorsModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [selectedImplementation, setSelectedImplementation] = useState<any | null>(null);
  
  // Donation modal state
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationIdea, setDonationIdea] = useState<Idea | null>(null);
  const [donationImplementation, setDonationImplementation] = useState<any | null>(null);

  // Extract chain ID from Privy format (eip155:5115 -> 5115)
  const getChainId = (chainId: string | number | undefined): string | null => {
    if (!chainId) return null;
    
    const chainIdStr = String(chainId);
    if (chainIdStr.startsWith('eip155:')) {
      return chainIdStr.substring(7); // Remove 'eip155:' prefix
    }
    return chainIdStr;
  };

  const currentChainId = getChainId(user?.wallet?.chainId);
  const isOnCitreaTestnet = currentChainId === '5115';

  // Debug logging to see what chain ID we're getting
  useEffect(() => {
    if (authenticated && user?.wallet?.chainId) {
      console.log('Raw chain ID from Privy:', user.wallet.chainId, typeof user.wallet.chainId);
      console.log('Extracted chain ID:', currentChainId);
      console.log('Is on Citrea Testnet:', isOnCitreaTestnet);
    }
  }, [authenticated, user?.wallet?.chainId, currentChainId, isOnCitreaTestnet]);

  // Handle refresh button click with detailed logging
  const handleRefreshClick = async () => {
    console.log('🔄 Refresh button clicked!');
    console.log('🔄 Current balance state:', { balance, loading: balanceLoading, error: balanceError });
    console.log('🔄 User info:', { 
      authenticated, 
      userId: user?.id,
      walletAddress: user?.wallet?.address,
      chainId: user?.wallet?.chainId 
    });
    
    // Log the full user object to help debug wallet ID
    if (user) {
      console.log('🔄 Full user object keys:', Object.keys(user));
      if (user.wallet) {
        console.log('🔄 Wallet object keys:', Object.keys(user.wallet));
      }
      if (user.linkedAccounts) {
        console.log('🔄 Linked accounts:', user.linkedAccounts);
      }
    }
    
    try {
      await refetchBalance();
      console.log('✅ Refresh completed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    }
  };

  // Handle transaction refresh
  const handleTransactionRefresh = async () => {
    if (!selectedIdea) return;

    try {
      console.log('🔄 Refreshing transaction statuses...');
      
      // Get all transaction hashes from donations
      const relevantDonations = selectedImplementation 
        ? selectedIdea.donations.filter(d => d.implementation_id === selectedImplementation.id)
        : selectedIdea.donations;
      
      const transactionHashes = relevantDonations.map(d => d.transaction_hash);
      
      if (transactionHashes.length === 0) {
        console.log('ℹ️ No transactions to refresh');
        return;
      }

      await refreshTransactionStatuses(transactionHashes);
      
      // Refresh the ideas data to show updated statuses
      await refetchIdeas();
      
      console.log('✅ Transaction refresh completed');
    } catch (error) {
      console.error('❌ Transaction refresh failed:', error);
    }
  };

  const ideaHasDonations = (idea: Idea) => {
    return Number(idea.total_donations) > 0 || idea.donations.length > 0;
  };

  const getImplementationDonations = (implementationId: string, idea: Idea) => {
    return idea.donations.filter(donation => donation.implementation_id === implementationId);
  };

  const getImplementationDonationTotal = (implementationId: string, idea: Idea) => {
    const donations = getImplementationDonations(implementationId, idea);
    return donations.reduce((total, donation) => total + Number(donation.amount), 0);
  };

  const handleAddIdea = async () => {
    if (!authenticated || !user?.wallet?.address || !newIdeaTitle.trim() || !newIdeaDescription.trim()) {
      return;
    }

    try {
      await createIdea(newIdeaTitle, newIdeaDescription, user.wallet.address);
      setNewIdeaTitle('');
      setNewIdeaDescription('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding idea:', error);
      alert('Error adding idea: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEditIdea = async (ideaId: string) => {
    if (!editTitle.trim() || !editDescription.trim()) {
      return;
    }

    try {
      await updateIdea(ideaId, editTitle, editDescription);
      setEditingIdea(null);
      setEditTitle('');
      setEditDescription('');
    } catch (error) {
      console.error('Error updating idea:', error);
      alert('Error updating idea: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteIdea(ideaId);
    } catch (error) {
      console.error('Error deleting idea:', error);
      alert('Error deleting idea: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const startEditing = (idea: Idea) => {
    setEditingIdea(idea.id);
    setEditTitle(idea.title);
    setEditDescription(idea.description);
  };

  const cancelEditing = () => {
    setEditingIdea(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleAddImplementation = async (ideaId: string) => {
    if (!newImplUrl.trim()) {
      return;
    }

    try {
      await createImplementation(
        ideaId,
        newImplUrl,
        newImplLabel || 'Website',
        newImplDescription,
        newImplCitreaAddress
      );
      setAddingImplementation(null);
      setNewImplUrl('');
      setNewImplLabel('');
      setNewImplDescription('');
      setNewImplCitreaAddress('');
    } catch (error) {
      console.error('Error adding implementation:', error);
      alert('Error adding implementation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteImplementation = async (implementationId: string, ideaId: string) => {
    if (!confirm('Are you sure you want to delete this implementation?')) {
      return;
    }

    try {
      await deleteImplementation(implementationId, ideaId);
    } catch (error) {
      console.error('Error deleting implementation:', error);
      alert('Error deleting implementation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const openDonorsModal = (idea: Idea, implementation?: any) => {
    setSelectedIdea(idea);
    setSelectedImplementation(implementation || null);
    setShowDonorsModal(true);
  };

  const closeDonorsModal = () => {
    setShowDonorsModal(false);
    setSelectedIdea(null);
    setSelectedImplementation(null);
  };

  // Donation modal handlers
  const openDonationModal = (idea: Idea, implementation?: any) => {
    setDonationIdea(idea);
    setDonationImplementation(implementation || null);
    setShowDonationModal(true);
  };

  const closeDonationModal = () => {
    setShowDonationModal(false);
    setDonationIdea(null);
    setDonationImplementation(null);
  };

  const handleDonationSuccess = () => {
    // Refresh both balance and ideas list
    refetchBalance();
    refetchIdeas();
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ideas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gray-100 backdrop-blur-sm px-4 py-2 rounded-full text-gray-600 font-medium shadow-sm">
              <Bitcoin className="h-4 w-4 text-orange-500" />
              {authenticated && isOnCitreaTestnet ? (
                <span>Connected to Citrea Testnet</span>
              ) : authenticated ? (
                <span>Connected - Chain ID: {currentChainId}</span>
              ) : (
                <span>Login to see chain information</span>
              )}
            </div>
            
            {/* Citrea Faucet Button */}
            <div className="mt-4">
              <a
                href="https://citrea.xyz/faucet"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Bitcoin className="h-5 w-5" />
                Citrea Faucet
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <h1 className="mt-8 text-4xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Citrea Ideas Hub
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              Share your innovative ideas for the Citrea blockchain ecosystem and discover implementations from the community.
            </p>

            {/* Auth Section */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!authenticated ? (
                <button
                  onClick={login}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex flex-col sm:flex-row gap-2 items-center text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Connected: {formatWalletAddress(user?.wallet?.address || '')}</span>
                    </div>
                    
                    {/* Balance Display */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm border border-gray-200">
                      <Wallet className="h-4 w-4 text-orange-500" />
                      {balanceLoading ? (
                        <div className="flex items-center gap-1">
                          <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-orange-500"></div>
                          <span className="text-xs">Loading...</span>
                        </div>
                      ) : balanceError ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Error</span>
                          <span className="text-xs text-gray-500" title={balanceError}>
                            ({balanceError.length > 20 ? balanceError.substring(0, 20) + '...' : balanceError})
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium text-orange-600">
                          {balance || '0.0000'} cBTC
                        </span>
                      )}
                      <button
                        onClick={handleRefreshClick}
                        disabled={balanceLoading}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 disabled:opacity-50"
                        title="Refresh balance"
                      >
                        <RefreshCw className={`h-3 w-3 ${balanceLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-200"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Network Warning */}
            {authenticated && !isOnCitreaTestnet && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Switch to Citrea Testnet</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Please switch to Citrea Testnet (Chain ID: 5115) to interact with ideas.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Current chain: {currentChainId}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Add Idea Section */}
        {authenticated && isOnCitreaTestnet && (
          <div className="mb-12">
            {!showAddForm ? (
              <div className="text-center">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-5 w-5" />
                  Share Your Idea
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Share Your Idea</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newIdeaTitle}
                      onChange={(e) => setNewIdeaTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter your idea title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newIdeaDescription}
                      onChange={(e) => setNewIdeaDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Describe your idea in detail..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddIdea}
                      disabled={!newIdeaTitle.trim() || !newIdeaDescription.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                    >
                      Submit Idea
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewIdeaTitle('');
                        setNewIdeaDescription('');
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ideas Grid */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Community Ideas</h2>
            <p className="text-gray-600">Explore innovative concepts from the Citrea community</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Error loading ideas: {error}
            </div>
          )}

          {ideas.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">No ideas yet</h3>
              <p className="text-gray-400">Be the first to share your innovative idea!</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {ideas.map((idea) => (
                <div key={idea.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    {editingIdea === idea.id ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditIdea(idea.id)}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex items-center gap-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                            {idea.title}
                          </h3>
                          <button
                            onClick={() => openDonorsModal(idea)}
                            className="flex items-center gap-1 text-orange-600 font-medium hover:text-orange-700 transition-colors duration-200 cursor-pointer"
                          >
                            <Bitcoin className="h-4 w-4" />
                            <span className="text-sm">{Number(idea.total_donations).toFixed(4)} cBTC</span>
                          </button>
                        </div>
                        
                        <p className="text-gray-600 mb-4 leading-relaxed">
                          {idea.description}
                        </p>

                        {/* Creator and Date Info */}
                        <div className="space-y-2 mb-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Created by: {formatWalletAddress(idea.creator_wallet_address)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(idea.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>{idea.donations.length} donations</span>
                          </div>
                        </div>

                        {/* Donation Button for Idea */}
                        {authenticated && isOnCitreaTestnet && user?.wallet?.address !== idea.creator_wallet_address && (
                          <div className="mb-4">
                            <button
                              onClick={() => openDonationModal(idea)}
                              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              <Heart className="h-4 w-4" />
                              Donate to Idea
                            </button>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {authenticated && isOnCitreaTestnet && user?.wallet?.address === idea.creator_wallet_address && (
                          <div className="mb-4">
                            {ideaHasDonations(idea) ? (
                              <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg text-sm">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Cannot edit/delete - has donations</span>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditing(idea)}
                                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteIdea(idea.id)}
                                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Implementations */}
                        {idea.implementations.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <LinkIcon className="h-4 w-4" />
                              Implementations
                            </h4>
                            <div className="space-y-2">
                              {idea.implementations.map((impl) => {
                                const implDonations = getImplementationDonations(impl.id, idea);
                                const implDonationTotal = getImplementationDonationTotal(impl.id, idea);
                                
                                return (
                                  <div key={impl.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <a
                                          href={impl.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                        >
                                          {impl.label}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                        {implDonations.length > 0 && (
                                          <button
                                            onClick={() => openDonorsModal(idea, impl)}
                                            className="flex items-center gap-1 text-orange-600 hover:text-orange-700 text-xs font-medium transition-colors duration-200 cursor-pointer bg-orange-50 px-2 py-1 rounded-full"
                                          >
                                            <Bitcoin className="h-3 w-3" />
                                            <span>{implDonationTotal.toFixed(4)} cBTC</span>
                                            <span className="text-gray-500">({implDonations.length})</span>
                                          </button>
                                        )}
                                      </div>
                                      {impl.description && (
                                        <p className="text-sm text-gray-600 mb-1">{impl.description}</p>
                                      )}
                                      <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span>Added by: {formatWalletAddress(idea.creator_wallet_address)}</span>
                                        </div>
                                        {impl.citrea_address && (
                                          <div className="flex items-center gap-1">
                                            <Bitcoin className="h-3 w-3" />
                                            <span>Citrea: {formatWalletAddress(impl.citrea_address)}</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Donation Button for Implementation */}
                                      {authenticated && isOnCitreaTestnet && user?.wallet?.address !== idea.creator_wallet_address && (
                                        <div className="mt-2">
                                          <button
                                            onClick={() => openDonationModal(idea, impl)}
                                            className="flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200"
                                          >
                                            <Heart className="h-3 w-3" />
                                            Donate to Implementation
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {authenticated && isOnCitreaTestnet && user?.wallet?.address === idea.creator_wallet_address && (
                                      <button
                                        onClick={() => handleDeleteImplementation(impl.id, idea.id)}
                                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add Implementation */}
                        {authenticated && isOnCitreaTestnet && user?.wallet?.address === idea.creator_wallet_address && (
                          <div className="mb-4">
                            {addingImplementation === idea.id ? (
                              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900">Add Implementation</h4>
                                <input
                                  type="text"
                                  value={newImplUrl}
                                  onChange={(e) => setNewImplUrl(e.target.value)}
                                  placeholder="URL (e.g., https://example.com)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                                <input
                                  type="text"
                                  value={newImplLabel}
                                  onChange={(e) => setNewImplLabel(e.target.value)}
                                  placeholder="Label (e.g., Website, Demo, GitHub)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                                <textarea
                                  value={newImplDescription}
                                  onChange={(e) => setNewImplDescription(e.target.value)}
                                  placeholder="Description (optional)"
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                                <input
                                  type="text"
                                  value={newImplCitreaAddress}
                                  onChange={(e) => setNewImplCitreaAddress(e.target.value)}
                                  placeholder="Citrea Address (optional)"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAddImplementation(idea.id)}
                                    disabled={!newImplUrl.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAddingImplementation(null);
                                      setNewImplUrl('');
                                      setNewImplLabel('');
                                      setNewImplDescription('');
                                      setNewImplCitreaAddress('');
                                    }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingImplementation(idea.id)}
                                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              >
                                <Plus className="h-4 w-4" />
                                Add Implementation
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donors Modal */}
      {showDonorsModal && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-indigo-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedImplementation ? 'Implementation Donors' : 'Idea Donors'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedIdea.title}
                    {selectedImplementation && (
                      <span className="text-indigo-600"> → {selectedImplementation.label}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTransactionRefresh}
                  disabled={txLoading}
                  className="flex items-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                  title="Refresh transaction statuses"
                >
                  <RefreshCw className={`h-4 w-4 ${txLoading ? 'animate-spin' : ''}`} />
                  {txLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={closeDonorsModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {txError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  Error refreshing transactions: {txError}
                </div>
              )}

              {(() => {
                const relevantDonations = selectedImplementation 
                  ? getImplementationDonations(selectedImplementation.id, selectedIdea)
                  : selectedIdea.donations;
                
                const totalAmount = relevantDonations.reduce((total, donation) => total + Number(donation.amount), 0);

                return (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-orange-600 font-semibold">
                        <Bitcoin className="h-5 w-5" />
                        <span>Total: {totalAmount.toFixed(4)} cBTC</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {relevantDonations.length} donation{relevantDonations.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {relevantDonations.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No donations yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Be the first to support this {selectedImplementation ? 'implementation' : 'idea'}!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {relevantDonations
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((donation) => (
                          <div key={donation.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-900">
                                  {formatWalletAddress(donation.donor_wallet_address)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-orange-600 font-semibold">
                                <Bitcoin className="h-4 w-4" />
                                <span>{Number(donation.amount).toFixed(4)} cBTC</span>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDateTime(donation.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  donation.status === 'confirmed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : donation.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">TX:</span>
                                <a
                                  href={`https://explorer.testnet.citrea.xyz/tx/${donation.transaction_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors duration-200 flex items-center gap-1"
                                >
                                  {formatWalletAddress(donation.transaction_hash)}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {showDonationModal && donationIdea && authenticated && user?.wallet?.address && (
        <DonationModal
          isOpen={showDonationModal}
          onClose={closeDonationModal}
          idea={donationIdea}
          implementation={donationImplementation}
          userWalletAddress={user.wallet.address}
          onSuccess={handleDonationSuccess}
        />
      )}
    </div>
  );
}

export default App;