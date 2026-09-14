import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type MidnightWalletProvider } from './wallet.js';
import { type NetworkConfig } from './config.js';
import { type PohPrivateState } from '../contracts/witnesses.js';

export type PohCircuits =
  | 'registerVerifier'
  | 'removeVerifier'
  | 'enrollCredential'
  | 'verifyPersonhood'
  | 'isVerifierTrusted';

export type PohProviders = MidnightProviders<any>;

export function buildProviders(
  wallet: MidnightWalletProvider,
  zkConfigPath: string,
  config: NetworkConfig,
  storeName: string,
): PohProviders {
  const zkConfigProvider = new NodeZkConfigProvider<PohCircuits>(zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider<string, PohPrivateState>({
      privateStateStoreName: storeName,
      privateStoragePasswordProvider: () => {
        const password = process.env['PRIVATE_STATE_PASSWORD'];
        if (!password) {
          throw new Error('PRIVATE_STATE_PASSWORD env var is required');
        }
        return password;
      },
      accountId: wallet.getCoinPublicKey(),
    }),
    publicDataProvider: indexerPublicDataProvider(
      config.indexer,
      config.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      config.proofServer,
      zkConfigProvider,
    ),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
}
