/*
  # Create Ideas Management System

  1. New Tables
    - `ideas`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, required)
      - `creator_wallet_address` (text, foreign key to user_profiles)
      - `total_donations` (numeric, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `implementations`
      - `id` (uuid, primary key)
      - `idea_id` (uuid, foreign key to ideas)
      - `url` (text, required)
      - `label` (text, default 'Website')
      - `description` (text)
      - `citrea_address` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `donations`
      - `id` (uuid, primary key)
      - `idea_id` (uuid, foreign key to ideas)
      - `implementation_id` (uuid, foreign key to implementations, optional)
      - `donor_wallet_address` (text, required)
      - `recipient_address` (text, required)
      - `amount` (numeric, required)
      - `transaction_hash` (text, unique)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own content
    - Add policies for public read access
    - Add policies for donation creation

  3. Indexes
    - Add indexes for frequently queried columns
    - Add indexes for foreign keys
    - Add indexes for sorting and filtering

  4. Triggers
    - Add updated_at triggers for ideas and implementations
    - Add trigger to update total_donations on ideas table
*/

-- Create ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  creator_wallet_address text NOT NULL REFERENCES user_profiles(wallet_address) ON DELETE CASCADE,
  total_donations numeric(20,6) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create implementations table
CREATE TABLE IF NOT EXISTS implementations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  url text NOT NULL,
  label text DEFAULT 'Website',
  description text DEFAULT '',
  citrea_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  implementation_id uuid REFERENCES implementations(id) ON DELETE SET NULL,
  donor_wallet_address text NOT NULL,
  recipient_address text NOT NULL,
  amount numeric(20,6) NOT NULL CHECK (amount > 0),
  transaction_hash text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ideas_creator ON ideas(creator_wallet_address);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_total_donations ON ideas(total_donations DESC);

CREATE INDEX IF NOT EXISTS idx_implementations_idea_id ON implementations(idea_id);
CREATE INDEX IF NOT EXISTS idx_implementations_created_at ON implementations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_idea_id ON donations(idea_id);
CREATE INDEX IF NOT EXISTS idx_donations_implementation_id ON donations(implementation_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_wallet_address);
CREATE INDEX IF NOT EXISTS idx_donations_recipient ON donations(recipient_address);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_transaction_hash ON donations(transaction_hash);

-- Enable Row Level Security
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE implementations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ideas table
CREATE POLICY "Anyone can read ideas"
  ON ideas
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create ideas"
  ON ideas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Creators can update their own ideas"
  ON ideas
  FOR UPDATE
  TO authenticated
  USING (creator_wallet_address = (
    SELECT wallet_address 
    FROM user_profiles 
    WHERE id = auth.uid()
  ))
  WITH CHECK (creator_wallet_address = (
    SELECT wallet_address 
    FROM user_profiles 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Creators can delete their own ideas"
  ON ideas
  FOR DELETE
  TO authenticated
  USING (creator_wallet_address = (
    SELECT wallet_address 
    FROM user_profiles 
    WHERE id = auth.uid()
  ));

-- RLS Policies for implementations table
CREATE POLICY "Anyone can read implementations"
  ON implementations
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create implementations"
  ON implementations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ideas 
      WHERE id = idea_id 
      AND creator_wallet_address = (
        SELECT wallet_address 
        FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Idea creators can update implementations"
  ON implementations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ideas 
      WHERE id = idea_id 
      AND creator_wallet_address = (
        SELECT wallet_address 
        FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ideas 
      WHERE id = idea_id 
      AND creator_wallet_address = (
        SELECT wallet_address 
        FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Idea creators can delete implementations"
  ON implementations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ideas 
      WHERE id = idea_id 
      AND creator_wallet_address = (
        SELECT wallet_address 
        FROM user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for donations table
CREATE POLICY "Anyone can read donations"
  ON donations
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can create donations"
  ON donations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Only system can update donation status"
  ON donations
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Create function to update total_donations on ideas table
CREATE OR REPLACE FUNCTION update_idea_total_donations()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total donations for the affected idea
  UPDATE ideas 
  SET total_donations = (
    SELECT COALESCE(SUM(amount), 0)
    FROM donations 
    WHERE idea_id = COALESCE(NEW.idea_id, OLD.idea_id)
    AND status = 'confirmed'
  )
  WHERE id = COALESCE(NEW.idea_id, OLD.idea_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update total_donations
CREATE TRIGGER update_idea_donations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_total_donations();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_implementations_updated_at
  BEFORE UPDATE ON implementations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();