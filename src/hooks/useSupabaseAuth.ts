import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '../lib/supabase';

export function useSupabaseAuth() {
  const { authenticated, user } = usePrivy();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated && user) {
      createOrUpdateUserProfile();
    } else {
      setUserProfile(null);
      setError(null);
    }
  }, [authenticated, user]);

  const createOrUpdateUserProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const walletAddress = user.wallet?.address;
      // Make email optional - use a default if not available
      const email = user.email?.address || `${walletAddress}@wallet.local`;

      if (!walletAddress) {
        throw new Error('Wallet address not found. Please ensure your wallet is connected.');
      }

      console.log('Creating/updating profile for:', { walletAddress, email: user.email?.address ? email : 'wallet-only' });

      // Check if user profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', fetchError);
        throw new Error('Failed to check existing profile');
      }

      if (existingProfile) {
        console.log('Updating existing profile:', existingProfile.id);
        // Update existing profile - only update email if a real email is provided
        const updateData: any = { updated_at: new Date().toISOString() };
        if (user.email?.address) {
          updateData.email = email;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('wallet_address', walletAddress)
          .select()
          .single();

        if (error) {
          console.error('Error updating user profile:', error);
          throw new Error('Failed to update user profile');
        } else {
          console.log('Profile updated successfully:', data);
          setUserProfile(data);
        }
      } else {
        console.log('Creating new profile for wallet:', walletAddress);
        // Create new profile
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            wallet_address: walletAddress,
            email: email,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user profile:', error);
          throw new Error('Failed to create user profile');
        } else {
          console.log('Profile created successfully:', data);
          setUserProfile(data);
        }
      }
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error);
      setError(error instanceof Error ? error.message : 'Failed to create or update profile');
    } finally {
      setLoading(false);
    }
  };

  return { 
    userProfile, 
    loading, 
    error,
    retry: createOrUpdateUserProfile 
  };
}