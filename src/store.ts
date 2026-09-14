import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';

// ============================================================================
// Campaign Store — Supabase-backed persistence with JSON fallback
//
// When Supabase is configured, uses PostgreSQL for persistence.
// When not configured, falls back to JSON file storage (development).
// ============================================================================

export interface CampaignRecord {
  id: string;
  title: string;
  organizer: string;
  description: string;
  purpose: string;
  scope: string;
  startDate: string;
  endDate: string;
  purposeType: string;
  status: 'live' | 'ended';
  creatorWallet: string;
  createdAt: string;
}

export interface RegistrationRecord {
  id: string;
  campaignId: string;
  walletHandle: string;
  registeredAt: string;
  nullifier: string;
  commitmentRef: string;
  txHash?: string;
}

// ── JSON File Fallback (development only) ──

import fs from 'node:fs';
import path from 'node:path';

interface StoreData {
  campaigns: CampaignRecord[];
  registrations: RegistrationRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): StoreData {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) {
    const initial: StoreData = { campaigns: [], registrations: [] };
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(STORE_FILE, 'utf-8');
  return JSON.parse(raw) as StoreData;
}

function saveStore(data: StoreData): void {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

// ── Supabase Operations ──

async function supabaseGetAllCampaigns(): Promise<CampaignRecord[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    title: row.title,
    organizer: row.organizer,
    description: row.description,
    purpose: row.purpose,
    scope: row.scope,
    startDate: row.start_date,
    endDate: row.end_date,
    purposeType: row.purpose_type,
    status: row.status,
    creatorWallet: row.creator_wallet,
    createdAt: row.created_at,
  }));
}

async function supabaseGetCampaignById(id: string): Promise<CampaignRecord | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  return {
    id: data.id,
    title: data.title,
    organizer: data.organizer,
    description: data.description,
    purpose: data.purpose,
    scope: data.scope,
    startDate: data.start_date,
    endDate: data.end_date,
    purposeType: data.purpose_type,
    status: data.status,
    creatorWallet: data.creator_wallet,
    createdAt: data.created_at,
  };
}

async function supabaseCreateCampaign(input: {
  title: string;
  organizer: string;
  description: string;
  purpose: string;
  scope: string;
  startDate: string;
  endDate: string;
  purposeType: string;
  creatorWallet: string;
}): Promise<CampaignRecord> {
  const client = getSupabaseClient();

  // Generate slug from title
  const id = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Check for ID collision
  const existing = await supabaseGetCampaignById(id);
  if (existing) {
    throw new Error(`Campaign with id "${id}" already exists`);
  }

  const { data, error } = await client
    .from('campaigns')
    .insert({
      id,
      title: input.title,
      organizer: input.organizer,
      description: input.description,
      purpose: input.purpose,
      scope: input.scope,
      start_date: input.startDate,
      end_date: input.endDate,
      purpose_type: input.purposeType,
      status: 'live',
      creator_wallet: input.creatorWallet,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    organizer: data.organizer,
    description: data.description,
    purpose: data.purpose,
    scope: data.scope,
    startDate: data.start_date,
    endDate: data.end_date,
    purposeType: data.purpose_type,
    status: data.status,
    creatorWallet: data.creator_wallet,
    createdAt: data.created_at,
  };
}

async function supabaseGetRegistrationsByCampaign(campaignId: string): Promise<RegistrationRecord[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('registrations')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('registered_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    campaignId: row.campaign_id,
    walletHandle: row.wallet_handle,
    registeredAt: row.registered_at,
    nullifier: row.nullifier,
    commitmentRef: row.commitment_ref,
    txHash: row.tx_hash,
  }));
}

async function supabaseGetRegistrationCount(campaignId: string): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  if (error) throw error;
  return count ?? 0;
}

async function supabaseAddRegistration(input: {
  campaignId: string;
  walletHandle: string;
  nullifier: string;
  commitmentRef: string;
  txHash?: string;
}): Promise<RegistrationRecord> {
  const client = getSupabaseClient();

  // Check for duplicate nullifier in this campaign
  const { data: existing } = await client
    .from('registrations')
    .select('id')
    .eq('campaign_id', input.campaignId)
    .eq('nullifier', input.nullifier)
    .single();

  if (existing) {
    throw new Error('Already registered in this campaign');
  }

  const { data, error } = await client
    .from('registrations')
    .insert({
      campaign_id: input.campaignId,
      wallet_handle: input.walletHandle,
      nullifier: input.nullifier,
      commitment_ref: input.commitmentRef,
      tx_hash: input.txHash,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    campaignId: data.campaign_id,
    walletHandle: data.wallet_handle,
    registeredAt: data.registered_at,
    nullifier: data.nullifier,
    commitmentRef: data.commitment_ref,
    txHash: data.tx_hash,
  };
}

async function supabaseIsRegistered(campaignId: string, nullifier: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('nullifier', nullifier);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── Public API (auto-selects Supabase or JSON) ──
// All functions return Promises for consistent async behavior.

export async function getAllCampaigns(): Promise<CampaignRecord[]> {
  if (isSupabaseConfigured()) {
    return supabaseGetAllCampaigns();
  }
  return loadStore().campaigns;
}

export async function getCampaignById(id: string): Promise<CampaignRecord | undefined> {
  if (isSupabaseConfigured()) {
    return supabaseGetCampaignById(id);
  }
  return loadStore().campaigns.find(c => c.id === id);
}

export async function createCampaign(input: {
  title: string;
  organizer: string;
  description: string;
  purpose: string;
  scope: string;
  startDate: string;
  endDate: string;
  purposeType: string;
  creatorWallet: string;
}): Promise<CampaignRecord> {
  if (isSupabaseConfigured()) {
    return supabaseCreateCampaign(input);
  }

  // JSON file fallback
  const store = loadStore();
  const id = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (store.campaigns.some(c => c.id === id)) {
    throw new Error(`Campaign with id "${id}" already exists`);
  }

  const campaign: CampaignRecord = {
    id,
    title: input.title,
    organizer: input.organizer,
    description: input.description,
    purpose: input.purpose,
    scope: input.scope,
    startDate: input.startDate,
    endDate: input.endDate,
    purposeType: input.purposeType,
    status: 'live',
    creatorWallet: input.creatorWallet,
    createdAt: new Date().toISOString(),
  };

  store.campaigns.push(campaign);
  saveStore(store);
  return campaign;
}

export async function getRegistrationsByCampaign(campaignId: string): Promise<RegistrationRecord[]> {
  if (isSupabaseConfigured()) {
    return supabaseGetRegistrationsByCampaign(campaignId);
  }
  return loadStore().registrations.filter(r => r.campaignId === campaignId);
}

export async function getRegistrationCount(campaignId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    return supabaseGetRegistrationCount(campaignId);
  }
  return loadStore().registrations.filter(r => r.campaignId === campaignId).length;
}

export async function getRegistrationByNullifier(
  campaignId: string,
  nullifier: string,
): Promise<RegistrationRecord | undefined> {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    const { data } = await client
      .from('registrations')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('nullifier', nullifier)
      .single();
    return data ? {
      id: data.id,
      campaignId: data.campaign_id,
      walletHandle: data.wallet_handle,
      registeredAt: data.registered_at,
      nullifier: data.nullifier,
      commitmentRef: data.commitment_ref,
      txHash: data.tx_hash,
    } : undefined;
  }
  return loadStore().registrations.find(
    r => r.campaignId === campaignId && r.nullifier === nullifier,
  );
}

export async function addRegistration(input: {
  campaignId: string;
  walletHandle: string;
  nullifier: string;
  commitmentRef: string;
  txHash?: string;
}): Promise<RegistrationRecord> {
  if (isSupabaseConfigured()) {
    return supabaseAddRegistration(input);
  }

  // JSON file fallback
  const store = loadStore();

  const existing = store.registrations.find(
    r => r.campaignId === input.campaignId && r.nullifier === input.nullifier,
  );
  if (existing) {
    throw new Error('Already registered in this campaign');
  }

  const registration: RegistrationRecord = {
    id: `reg-${input.campaignId}-${Date.now().toString(36)}`,
    campaignId: input.campaignId,
    walletHandle: input.walletHandle,
    registeredAt: new Date().toISOString(),
    nullifier: input.nullifier,
    commitmentRef: input.commitmentRef,
    txHash: input.txHash,
  };

  store.registrations.push(registration);
  saveStore(store);
  return registration;
}

export async function isRegistered(campaignId: string, nullifier: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    return supabaseIsRegistered(campaignId, nullifier);
  }
  return loadStore().registrations.some(
    r => r.campaignId === campaignId && r.nullifier === nullifier,
  );
}
