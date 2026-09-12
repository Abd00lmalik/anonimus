import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  getSchnorrReduction(context: __compactRuntime.WitnessContext<Ledger, PS>,
                      challengeHash_0: bigint): [PS, [bigint, bigint]];
  local_secret_key(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_credential_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_credential_salt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_registry_path(context: __compactRuntime.WitnessContext<Ledger, PS>,
                    commitment_0: Uint8Array): [PS, { leaf: Uint8Array,
                                                      path: { sibling: { field: bigint
                                                                       },
                                                              goes_left: boolean
                                                            }[]
                                                    }];
  get_attestation(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { announcement: __compactRuntime.JubjubPoint,
                                                                                response: bigint
                                                                              }];
  get_expiration(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  getAttestedVerifierPk(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, __compactRuntime.JubjubPoint];
}

export type ImpureCircuits<PS> = {
  registerVerifier(context: __compactRuntime.CircuitContext<PS>,
                   vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  removeVerifier(context: __compactRuntime.CircuitContext<PS>,
                 vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  enrollCredential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyPersonhood(context: __compactRuntime.CircuitContext<PS>,
                   campaignId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  isVerifierTrusted(context: __compactRuntime.CircuitContext<PS>,
                    vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  registerVerifier(context: __compactRuntime.CircuitContext<PS>,
                   vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  removeVerifier(context: __compactRuntime.CircuitContext<PS>,
                 vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  enrollCredential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyPersonhood(context: __compactRuntime.CircuitContext<PS>,
                   campaignId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  isVerifierTrusted(context: __compactRuntime.CircuitContext<PS>,
                    vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  deriveCredId(credSecret_0: Uint8Array): Uint8Array;
  deriveCredIdField(credSecret_0: Uint8Array): bigint;
  deriveCommitment(credSecret_0: Uint8Array, salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  deriveCredId(context: __compactRuntime.CircuitContext<PS>,
               credSecret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveCredIdField(context: __compactRuntime.CircuitContext<PS>,
                    credSecret_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  deriveCommitment(context: __compactRuntime.CircuitContext<PS>,
                   credSecret_0: Uint8Array,
                   salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  registerVerifier(context: __compactRuntime.CircuitContext<PS>,
                   vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  removeVerifier(context: __compactRuntime.CircuitContext<PS>,
                 vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  enrollCredential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyPersonhood(context: __compactRuntime.CircuitContext<PS>,
                   campaignId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  isVerifierTrusted(context: __compactRuntime.CircuitContext<PS>,
                    vk_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  readonly adminKey: Uint8Array;
  verifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: __compactRuntime.JubjubPoint): boolean;
    [Symbol.iterator](): Iterator<__compactRuntime.JubjubPoint>
  };
  registry: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  spentNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
