import { CompiledContract } from '@midnight-ntwrk/compact-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract } from './managed/poh_core/contract/index.js';
import { pohWitnesses, type PohPrivateState } from './witnesses.js';

export {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
  type ImpureCircuits,
} from './managed/poh_core/contract/index.js';
export type { PohPrivateState } from './witnesses.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const zkConfigPath = path.resolve(currentDir, 'managed', 'poh_core');

// Compiled contract with file-based ZK assets. Witnesses are attached per
// caller (admin vs user) via withWitnesses at use sites, because admin and
// user run different witness bundles over the same contract class.
export const CompiledPohCoreContract = CompiledContract.make(
  'PohCoreContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(pohWitnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
