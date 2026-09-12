import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// Campaign Store — JSON file persistence for Phase 1
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
}

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

// ── Campaign operations ──

export function getAllCampaigns(): CampaignRecord[] {
  return loadStore().campaigns;
}

export function getCampaignById(id: string): CampaignRecord | undefined {
  return loadStore().campaigns.find(c => c.id === id);
}

export function createCampaign(input: {
  title: string;
  organizer: string;
  description: string;
  purpose: string;
  scope: string;
  startDate: string;
  endDate: string;
  purposeType: string;
  creatorWallet: string;
}): CampaignRecord {
  const store = loadStore();
  const id = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Check for ID collision
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

// ── Registration operations ──

export function getRegistrationsByCampaign(campaignId: string): RegistrationRecord[] {
  return loadStore().registrations.filter(r => r.campaignId === campaignId);
}

export function getRegistrationCount(campaignId: string): number {
  return loadStore().registrations.filter(r => r.campaignId === campaignId).length;
}

export function getRegistrationByNullifier(
  campaignId: string,
  nullifier: string,
): RegistrationRecord | undefined {
  return loadStore().registrations.find(
    r => r.campaignId === campaignId && r.nullifier === nullifier,
  );
}

export function addRegistration(input: {
  campaignId: string;
  walletHandle: string;
  nullifier: string;
  commitmentRef: string;
}): RegistrationRecord {
  const store = loadStore();

  // Check for duplicate nullifier in this campaign
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
  };

  store.registrations.push(registration);
  saveStore(store);
  return registration;
}

export function isRegistered(campaignId: string, nullifier: string): boolean {
  return loadStore().registrations.some(
    r => r.campaignId === campaignId && r.nullifier === nullifier,
  );
}
