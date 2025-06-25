import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/supabase';

export interface IdeaWithDetails extends Tables<'ideas'> {
  implementations: Tables<'implementations'>[];
  donations: Tables<'donations'>[];
}

export function useIdeas() {
  const [ideas, setIdeas] = useState<IdeaWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ideas with their implementations and donations
      const { data: ideasData, error: ideasError } = await supabase
        .from('ideas')
        .select(`
          *,
          implementations (*),
          donations (*)
        `)
        .order('created_at', { ascending: false });

      if (ideasError) {
        throw ideasError;
      }

      setIdeas(ideasData || []);
    } catch (err) {
      console.error('Error fetching ideas:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ideas');
    } finally {
      setLoading(false);
    }
  };

  const createIdea = async (title: string, description: string, creatorWalletAddress: string) => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          title: title.trim(),
          description: description.trim(),
          creator_wallet_address: creatorWalletAddress,
        })
        .select(`
          *,
          implementations (*),
          donations (*)
        `)
        .single();

      if (error) {
        throw error;
      }

      setIdeas(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error creating idea:', err);
      throw err;
    }
  };

  const updateIdea = async (ideaId: string, title: string, description: string) => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .update({
          title: title.trim(),
          description: description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ideaId)
        .select(`
          *,
          implementations (*),
          donations (*)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setIdeas(prev => prev.map(idea => 
        idea.id === ideaId ? data : idea
      ));

      return data;
    } catch (err) {
      console.error('Error updating idea:', err);
      throw err;
    }
  };

  const deleteIdea = async (ideaId: string) => {
    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', ideaId);

      if (error) {
        throw error;
      }

      // Update the local state
      setIdeas(prev => prev.filter(idea => idea.id !== ideaId));
    } catch (err) {
      console.error('Error deleting idea:', err);
      throw err;
    }
  };

  const createImplementation = async (
    ideaId: string,
    url: string,
    label: string,
    description: string,
    citreaAddress?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('implementations')
        .insert({
          idea_id: ideaId,
          url: url.startsWith('http') ? url : `https://${url}`,
          label: label.trim() || 'Website',
          description: description.trim(),
          citrea_address: citreaAddress?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setIdeas(prev => prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, implementations: [...idea.implementations, data] }
          : idea
      ));

      return data;
    } catch (err) {
      console.error('Error creating implementation:', err);
      throw err;
    }
  };

  const deleteImplementation = async (implementationId: string, ideaId: string) => {
    try {
      const { error } = await supabase
        .from('implementations')
        .delete()
        .eq('id', implementationId);

      if (error) {
        throw error;
      }

      // Update the local state
      setIdeas(prev => prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, implementations: idea.implementations.filter(impl => impl.id !== implementationId) }
          : idea
      ));
    } catch (err) {
      console.error('Error deleting implementation:', err);
      throw err;
    }
  };

  const createDonation = async (
    ideaId: string,
    implementationId: string | null,
    donorWalletAddress: string,
    recipientAddress: string,
    amount: number,
    transactionHash: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .insert({
          idea_id: ideaId,
          implementation_id: implementationId,
          donor_wallet_address: donorWalletAddress,
          recipient_address: recipientAddress,
          amount,
          transaction_hash: transactionHash,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setIdeas(prev => prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, donations: [...idea.donations, data] }
          : idea
      ));

      return data;
    } catch (err) {
      console.error('Error creating donation:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  return {
    ideas,
    loading,
    error,
    refetch: fetchIdeas,
    createIdea,
    updateIdea,
    deleteIdea,
    createImplementation,
    deleteImplementation,
    createDonation,
  };
}