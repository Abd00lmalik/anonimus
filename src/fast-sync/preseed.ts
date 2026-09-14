import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { DustSecretKey, ZswapSecretKeys } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { PublicKey } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import type { EmptyRefStates } from './reference-bundle.js';

export interface NewWalletKeys {
  shieldedSecretKeys: ZswapSecretKeys;
  unshieldedPublicKey: PublicKey;
  dustSecretKey: DustSecretKey;
}

export interface SeededSnapshots {
  shielded: string;
  unshielded: string;
  dust?: string;
}

export function preSeedNewWallet(
  keys: NewWalletKeys,
  networkId: string,
  emptyRef: EmptyRefStates,
): SeededSnapshots | null {
  try {
    setNetworkId(networkId);

    const refSh = JSON.parse(emptyRef.shielded) as Record<string, unknown>;
    const refUn = JSON.parse(emptyRef.unshielded) as Record<string, unknown>;

    const shieldedSnap: Record<string, unknown> = {
      publicKeys: {
        coinPublicKey: keys.shieldedSecretKeys.coinPublicKey,
        encryptionPublicKey: keys.shieldedSecretKeys.encryptionPublicKey,
      },
      state: refSh['state'],
      protocolVersion: refSh['protocolVersion'],
      networkId,
      coinHashes: {},
    };
    if (refSh['offset'] !== undefined) shieldedSnap['offset'] = refSh['offset'];

    const pk = keys.unshieldedPublicKey;
    const unshieldedSnap: Record<string, unknown> = {
      publicKey: { publicKey: pk.publicKey, addressHex: pk.addressHex, address: pk.address },
      state: { availableUtxos: [], pendingUtxos: [] },
      protocolVersion: refUn['protocolVersion'],
      networkId,
    };
    if (refUn['appliedId'] !== undefined) unshieldedSnap['appliedId'] = refUn['appliedId'];

    let dustSnap: string | undefined;
    try {
      const refDust = JSON.parse(emptyRef.dust) as Record<string, unknown>;
      dustSnap = JSON.stringify({
        publicKey: { publicKey: keys.dustSecretKey.publicKey.toString() },
        state: refDust['state'],
        protocolVersion: refDust['protocolVersion'],
        networkId,
        offset: refDust['offset'],
      });
    } catch {
      // Dust preseed failure is non-fatal
    }

    return {
      shielded: JSON.stringify(shieldedSnap),
      unshielded: JSON.stringify(unshieldedSnap),
      dust: dustSnap,
    };
  } catch {
    return null;
  }
}

export function isSeedable(emptyRef: EmptyRefStates, birthday: number | undefined): boolean {
  return birthday !== undefined && emptyRef.height <= birthday;
}
