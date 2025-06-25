/*
  # Fix Row-Level Security Policies for Ideas Table

  1. Policy Updates
    - Update INSERT policy for ideas table to allow authenticated users to create ideas
    - Update other policies to work with the wallet-based authentication system
  
  2. Security
    - Maintain RLS protection while allowing proper functionality
    - Ensure users can only manage their own ideas based on wallet address
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Authenticated users can create ideas" ON public.ideas;
DROP POLICY IF EXISTS "Creators can update their own ideas" ON public.ideas;
DROP POLICY IF EXISTS "Creators can delete their own ideas" ON public.ideas;

-- Create new INSERT policy that allows authenticated users to create ideas
CREATE POLICY "Allow authenticated users to create ideas"
  ON public.ideas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create UPDATE policy for idea creators
CREATE POLICY "Allow creators to update their own ideas"
  ON public.ideas
  FOR UPDATE
  TO authenticated
  USING (
    creator_wallet_address IN (
      SELECT wallet_address 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    creator_wallet_address IN (
      SELECT wallet_address 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Create DELETE policy for idea creators
CREATE POLICY "Allow creators to delete their own ideas"
  ON public.ideas
  FOR DELETE
  TO authenticated
  USING (
    creator_wallet_address IN (
      SELECT wallet_address 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Update implementations policies to work better with the authentication system
DROP POLICY IF EXISTS "Authenticated users can create implementations" ON public.implementations;
DROP POLICY IF EXISTS "Idea creators can update implementations" ON public.implementations;
DROP POLICY IF EXISTS "Idea creators can delete implementations" ON public.implementations;

-- Create new implementation policies
CREATE POLICY "Allow authenticated users to create implementations"
  ON public.implementations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.ideas 
      WHERE ideas.id = implementations.idea_id 
      AND ideas.creator_wallet_address IN (
        SELECT wallet_address 
        FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Allow idea creators to update implementations"
  ON public.implementations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.ideas 
      WHERE ideas.id = implementations.idea_id 
      AND ideas.creator_wallet_address IN (
        SELECT wallet_address 
        FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.ideas 
      WHERE ideas.id = implementations.idea_id 
      AND ideas.creator_wallet_address IN (
        SELECT wallet_address 
        FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Allow idea creators to delete implementations"
  ON public.implementations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.ideas 
      WHERE ideas.id = implementations.idea_id 
      AND ideas.creator_wallet_address IN (
        SELECT wallet_address 
        FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  );