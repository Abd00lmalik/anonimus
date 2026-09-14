-- ============================================================================
-- Anonimus Database Schema for Supabase
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to create the required tables.
-- ============================================================================

-- Enable UUID extension (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CAMPAIGNS TABLE
-- Stores campaign metadata created by operators.
-- On-chain state (Merkle root, nullifiers) is on Midnight, not here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organizer TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  purpose_type TEXT NOT NULL DEFAULT 'community'
    CHECK (purpose_type IN ('airdrop', 'rewards', 'access', 'allowlist', 'community', 'other')),
  status TEXT NOT NULL DEFAULT 'live'
    CHECK (status IN ('live', 'ended')),
  creator_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing campaigns by creator
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns (creator_wallet);

-- Index for listing active campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);

-- ============================================================================
-- REGISTRATIONS TABLE
-- Stores campaign registrations (off-chain record of on-chain events).
-- The nullifier is the unique identifier for each registration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY DEFAULT ('reg-' || encode(gen_random_bytes(8), 'hex')),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  wallet_handle TEXT NOT NULL,
  nullifier TEXT NOT NULL,
  commitment_ref TEXT NOT NULL,
  tx_hash TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one nullifier per campaign
  UNIQUE (campaign_id, nullifier)
);

-- Index for listing registrations by campaign
CREATE INDEX IF NOT EXISTS idx_registrations_campaign ON registrations (campaign_id);

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_registrations_nullifier ON registrations (campaign_id, nullifier);

-- Index for wallet lookup
CREATE INDEX IF NOT EXISTS idx_registrations_wallet ON registrations (wallet_handle);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- Automatically update the updated_at column on row updates.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Campaigns: anyone can read, only authenticated users can create
CREATE POLICY "Allow public read access to campaigns"
  ON campaigns FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow campaign creators to update their own campaigns"
  ON campaigns FOR UPDATE
  USING (creator_wallet = auth.uid()::text);

-- Registrations: anyone can read, only authenticated users can create
CREATE POLICY "Allow public read access to registrations"
  ON registrations FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to create registrations"
  ON registrations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- VIEWS (optional - for easier querying)
-- ============================================================================

-- View: campaign with registration counts
CREATE OR REPLACE VIEW campaign_with_counts AS
SELECT
  c.*,
  COALESCE(r.registration_count, 0) as registration_count
FROM campaigns c
LEFT JOIN (
  SELECT campaign_id, COUNT(*) as registration_count
  FROM registrations
  GROUP BY campaign_id
) r ON c.id = r.campaign_id;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. The 'id' field for campaigns is a slug derived from the title.
--    It must be unique across all campaigns.
--
-- 2. The 'nullifier' field in registrations is the on-chain nullifier
--    computed from the participant's credential and campaign ID.
--    It ensures one registration per credential per campaign.
--
-- 3. The 'commitment_ref' is the hex-encoded Merkle leaf commitment
--    stored on-chain in the credential registry.
--
-- 4. The 'tx_hash' is the Midnight transaction hash for the
--    verification transaction. It can be used to verify the
--    registration on-chain via the block explorer.
--
-- 5. RLS policies use auth.uid() which maps to the Supabase auth user ID.
--    For the MVP, we're using service-role key server-side, so RLS
--    is not strictly enforced. It's set up for future authentication.
--
-- 6. No biometric data, face images, or private identity information
--    is stored in this database. Only campaign metadata and
--    cryptographic primitives (nullifiers, commitments).
