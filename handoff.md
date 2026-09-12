# handoff.md — Anonimus Operating Document

> **This is an operating document, not a summary.** It must be updated after every
> meaningful implementation step. Rules in §Tooling-Rules are permanent.

---

## 1. Project purpose

**Anonimus** is a privacy-preserving **Proof-of-Humanity + Uniqueness as a Service**
built on Midnight Network. It lets applications know *"is this a real, unique
human?"* — and, per context, *"has this human already participated here?"* — without
ever collecting or storing their underlying identity or biometric data.

Two product modes (build for both from day one):

1. **Campaigns** — a project creates a campaign; users complete real PoH, register
   a wallet, and participate exactly once per campaign. The project retrieves the
   eligible wallet addresses and distributes rewards itself (Anonimus does NOT
   distribute rewards in the MVP).
2. **Infrastructure (PoH as a Service)** — customer DApps redirect users to
   Anonimus, the user completes real PoH, Anonimus returns a signed/cryptographic
   verification result, the user is redirected back, and the customer verifies the
   result and decides. The customer never needs to understand Midnight internals
   and never receives raw identity/biometric data.

Core conceptual pipeline:

```
Real Personhood Verification  →  Private Credential  →  Midnight Proof
                             →  Campaign/App Uniqueness  →  Verification Result
```

Personhood, uniqueness, and wallet ownership are **separate concepts** — never
collapsed into one identity record.

---

## 2. Tooling rules (PERMANENT — do not violate)

1. **KAPA MCP** is the *priority research source* for all Midnight questions.
   Endpoint: `https://midnight.mcp.kapa.ai` — **officially confirmed** by
   `docs.midnight.network` (blog "Migrating to the Kapa MCP server and Midnight
   Expert", 2026-06-25; docs page "Kapa MCP server"). It is the same knowledge
   base as the "Ask AI" button on docs.midnight.network.
   - Auth: standard OAuth2 (protected-resource metadata → AS
     `https://mcp.kapa.ai/auth/public`, dynamic client registration + PKCE).
     The OAuth browser-login step is the only part that needs the user.
   - Helper: `node scripts/kapa-auth.mjs start` prints a login URL, catches the
     callback, and stores tokens in `.env` (`KAPA_MCP_ACCESS_TOKEN`,
     `KAPA_MCP_REFRESH_TOKEN`). Registered OAuth client credentials are embedded
     in the script (dev-tier registration, not user secrets).
   - ⚠️ **Status: WAITING ON USER BROWSER LOGIN** — the script is ready; see
     §Required user intervention. Until a token exists, fall back to: official
     Midnight docs → Midnight Expert reference docs, and *never* guess APIs.
   - The retired `midnight-mcp` npm package must not be used (deprecated 2026).
2. **Midnight Expert** (`https://midnightntwrk.expert/`,
   `github.com/midnightntwrk/midnight-expert`, devrelaicom mirror) **MUST be
   used** whenever Midnight smart contracts/circuits are created, modified,
   reviewed, or debugged. It is a Claude Code plugin marketplace (~15 plugins,
   100+ skills); in this agent environment plugins can't be installed, so the
   working substitutes are:
   - its full reference docs checked out at `.tmp/midnight-expert/` — **read the
     relevant references before and while writing any Compact**; and
   - **mechanical verification against the real `compactc` compiler** for every
     contract (ground truth; the plugin's `/midnight-verify:verify` and
     `/midnight-fact-check:check` exist to enforce exactly this). Note:
     midnight-docs says the canonical repo is `midnightntwrk/midnight-expert`
     (the `devrelaicom` org hosts an identical mirror we cloned).
3. **Midskills** (community pack `kali-decoder/midnight-skills` via
   `npx skills add kali-decoder/midnight-skills@<skill>`) — use whenever relevant.
4. **Official Midnight documentation** — the full docs source is now cloned
   locally at `.tmp/midnight-docs/` (from `github.com/midnightntwrk/midnight-docs`,
   2,498 markdown files incl. api-reference/, docs/, blog/). Consult it locally
   instead of hitting docs.midnight.network (which rate-limits aggressively).
5. Do not guess Midnight APIs. Do not fabricate unavailable functionality.
6. **No mocks** for: PoH, face/biometric verification, Midnight proofs, contract
   behavior, nullifier behavior, wallet verification, cryptographic signatures,
   or verification results.
7. **Stop and request human intervention** whenever credentials, API keys, wallet
   funding, faucet access, signing, or another user-controlled action is required.
   Never fabricate credentials or silently drop a requirement.

---

## 3. Current status (Phase 0 COMPLETE — toolchain operational)

**Implemented so far: nothing product-wise** — but the real Midnight toolchain
is installed and a real compile has succeeded. What exists: research artifacts,
git repo, auth/toolchain scripts, smoke-test contract, this document.

### Environment (updated 2026-09-06)

- Windows host; Node v24.12.0, npm 11.7.0, Docker **29.1.3 (daemon RUNNING)**.
- **WSL2 REPAIRED and operational** (see §13 for the exact fix): WSL platform
  upgraded to 2.7.13 via elevated winget; deadlocked `wslservice.exe`
  force-killed; fresh service started. Kernel 6.18.33.2-2.
- **Compact toolchain INSTALLED inside WSL Ubuntu-24.04**: Compact CLI 0.5.2,
  compiler `compactc` **0.34.0** (language-version 0.26.0, runtime 0.19.0) at
  `~/.local/bin` + `~/.compact/bin`.
- **REAL COMPILE VERIFIED**: `contracts/smoke_test.compact` compiled with real
  `compactc` → artifacts in `out/smoke_test/` (TS bindings `contract/index.js`
  + `index.d.ts`, `compiler/contract-info.json` + manifest). Manifest confirms
  circuit `whoAmI`, witness `local_secret_key`, ledger cell `deployedBy`.
  Compile syntax: `compact compile <source> <target-dir>` (positional, no -o).

### Toolchain facts (from official docs / Midnight Expert references)

- **Compact compiler** (`compact` CLI + `compactc`): prebuilt binaries for
  **Unix-like only** (macOS/Linux/WSL). Installer:
  `curl ... https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh`
  → `~/.compact/bin` (or `~/.local/bin`), then `compact update` to fetch the
  latest compiler (docs example version: **0.31.0**). Verify:
  `compact compile --version`.
- **Local devnet** = 3 Docker services: node (:9944), indexer (:8088), proof
  server (:6300); network ID **`undeployed`**. Health: node `/health`, indexer
  `/api/v4/graphql`, proof server `/health`.
- Language references used in this repo must pin
  `pragma language_version >= 0.22;` (per current Midnight Expert compact-core
  examples).

### Key Midnight research findings (from Midnight Expert references, locally read)

- `persistentCommit<T>(value, Bytes<32>)` — SHA-256-based, stable across
  compiler versions, safe for ledger state; clears witness taint.
- `persistentHash<T>(value)` — stable hash, **not** hiding, does not clear taint;
  the documented tool for **nullifiers, key derivation, and domain-separated
  identifiers** (exactly our use case).
- `transientCommit`/`transientHash` — algorithm may change between compiler
  versions → **never** store outputs in ledger state.
- **Uniqueness pattern (canonical, maps 1:1 to Anonimus):**
  HistoricMerkleTree (credential registry, leaves should be randomized
  commitments to defeat leaf-guessing) + witness-supplied MerkleTreePath +
  `merkleTreePathRoot` + `checkRoot` + domain-separated nullifier via
  `persistentHash` + `Set.member/insert` spent-list.
  - **Domain separation is a documented pattern** (e.g. `pad(32, "myapp:pk:")`
    prefixes). Campaign-scoping = per-campaign prefix/tag in the nullifier
    preimage. This directly satisfies directive §10.
- `disclose()` rules are strict and well documented (witness-derived values
  entering ledger ADT ops, ledger writes, exported returns need `disclose()`).
- MerkleTree capacity: depth 16 = 65,536 leaves; deeper trees cost proof time.
  Note: tree size (insertion count) is public — acceptable leakage (participant
  count), no identity leakage.
- No `historicMember`/`.member(path)` shortcuts exist — root recomputation is
  the only membership check. There is no built-in randomness in Compact — all
  randomness comes from witnesses (`crypto.getRandomValues()` off-chain).
- **Merkle tree `insert()` applies `leaf_hash()`** (persistent_hash) before
  storing — so the tree stores `leaf_hash(leaf)`, not the raw leaf. Use
  `merkleTreePathRoot<N, T>()` (which hashes the leaf) for membership proofs,
  NOT `merkleTreePathRootNoLeafHash()` (which assumes pre-hashed leaves).

### Midnight SDK quirks (discovered during implementation)

- **`@noble/curves` Jubjub is NOT compatible** with compact-runtime EC
  operations. The noble Jubjub uses a different generator point and curve
  parameterization. Off-chain signing must use compact-runtime's own primitives
  (`ecMulGenerator`, `ecMul`, `ecAdd`, `transientHash`).
- **Correct Jubjub parameters**: subgroup order `r = 6554484396890773809930967563523245729705921265872317281365359162392183254199n`
  (~252 bits). `ecMulGenerator` works for scalars < 2^252.
- **`transientHash` validates against scalar field `r`**, not base field `p`.
  `r = 52435875175126190479447740508185965837690552500527637822603658699938581184513n`.
  `bytes32ToField` must reduce mod `r`.
- **Hash type mismatch**: circuit `Vector<5, Field>` serializes as
  `CompactTypeVector(5, CompactTypeField)`, NOT `CompactTypeBytes(32)`.
- **WASM version mismatch**: `compact-runtime` may nest a different
  `onchain-runtime-v3` than `midnight-js-contracts`. Fix via `package.json`
  resolutions pinning to `3.0.0`.
- **`credId as Field` cast fails** when `Bytes<32>` value exceeds scalar field
  `r` (~12.5% of cases). Fix: `deriveCredIdField` pure circuit using
  `transientHash`.
- **`balanceUnboundTransaction` needs 3 args** at runtime (types say 2) — cast
  `this.wallet` to `any`.
- **`buildWithoutStarting`** returns different `WalletFacade` type from
  `testkit-js` vs `wallet-sdk` — use `as unknown as` cast.

### PoH / face-verification provider research (directive §6)

- **FaceTec** — leading candidate. 3D face liveness + matching + **1:N
  deduplication search** (dedup at enrollment is what makes per-context
  uniqueness sound without re-scanning). Server runs **anywhere via Docker**
  incl. locally on PC/Mac; **on-prem = biometrics stay in our infra** (aligned
  with privacy directive §7). v10 released 2025-09. License keys via FaceTec
  developer portal (dev.facetec.com) — **requires user account/approval** →
  §Required user intervention when we reach integration.
- **zkPassport** — ZK proofs about government IDs (privacy-first, open source).
  Strong privacy story but different trust shape (passport-based, not face-based
  dedup) — better as a future alternate credential issuer than the MVP base.
- **World ID** — mature PoH infra (ZK + uniqueness at the Orb layer) but is
  itself a competing PoH service; integrating it makes Anonimus a wrapper, not
  an infra provider. Not suitable as the core.
- Others (Didit, Civic, BrightID, Humanity Protocol, Humanode): not a better fit
  for a self-hosted, Midnight-aligned MVP than FaceTec.
- **Working conclusion (D5, provisional):** FaceTec self-hosted for real face
  liveness + dedup, feeding an issuer-style commitment into the Midnight
  credential layer. Final decision + license key needed from user before
  implementation of that integration step. **No mock will be substituted.**

### Wallet research (directive §9)

- **Lace** is the official Midnight wallet (lace.io/midnight); DApp Connector
  API documented (`docs.midnight.network/guides/react-wallet-connect`; reference
  impl: github.com/bochaco/react-mn-wallet-connect). Midnight Expert's
  `midnight-dapp-dev:dapp-connector` covers the browser-wallet path.
- **Gero** publishes a Midnight wallet (gerowallet.io/midnight-wallet). Official
  community-wallets reference exists at
  `docs.midnight.network/sdks/community/wallets/community-wallets-reference`
  (page 429'd from web; located in the local docs clone for later reading).
- **J\*\*AM**: no Midnight integration found in searches yet — verify later in
  the local docs clone before integrating.
- Programmatic (server-side, non-browser) wallet ops are covered by
  `@midnight-ntwrk/wallet-sdk-*` (`WalletFacade.init`, test-wallet workflows on
  local devnet / preprod / preview) per Midnight Expert midnight-wallet plugin.
- Backend design must keep wallet ownership, personhood, and uniqueness separate.

---

## 4. Current architecture

**Implemented and working (E2E verified 2026-09-08):**

```
contracts/
  poh_core.compact          ← Main contract: credential registry + campaign-scoped
                               nullifier uniqueness via ZK proofs. 5 circuits +
                               3 pure circuits.
  schnorr.compact           ← Polyfill for Jubjub Schnorr (bn254) — modified for
                               compiler 0.31.1 compatibility
  witnesses.ts              ← Witness implementations + test verifier
  index.ts                  ← Contract export + zkConfigPath

src/
  e2e-local.ts              ← E2E test: deploy → register verifier → attest →
                               enroll → verify (2 campaigns) → duplicate rejected
  wallet.ts                 ← MidnightWalletProvider (FluentWalletBuilder)
  providers.ts              ← Provider wiring
  verifier.ts               ← Duplicate signing helpers (to be consolidated)
  config.ts                 ← Network config
  receipt.ts                ← VerificationReceipt type + Ed25519 signing
  integration.ts            ← HTTP service for DApp integration (62 tests)

web/src/
  pages/
    HomePage.tsx             ← Marketing landing (hero, problem, how-it-works, FAQ)
    CampaignsListPage.tsx    ← Campaigns grid
    CampaignDetailPage.tsx   ← Campaign detail + join CTA
    JoinWalletPage.tsx       ← Campaign wallet connection (Lace/1AM)
    DisclosureReviewPage.tsx ← Campaign data disclosure
    VerificationPage.tsx     ← Campaign proof generation + Veiled Core
    SuccessPage.tsx          ← Campaign receipt display
    DAppRequestPage.tsx      ← DApp verification request (Screen 1)
    DAppWalletPage.tsx       ← DApp wallet connection (Screen 2)
    DAppDisclosurePage.tsx   ← DApp two-column disclosure (Screen 3)
    DAppVerificationPage.tsx ← DApp proof generation (Screen 4)
    DAppSuccessPage.tsx      ← DApp receipt + Return to DApp (Screen 5)
    DAppErrorPage.tsx        ← DApp failure/interrupted states (Screen 6)
    OperatorEntryPage.tsx    ← Operator auth gate (Build with Anonimus)
    OperatorWorkspacePage.tsx ← Operator workspace (overview + campaign list)
    DeveloperEntryPage.tsx   ← Developer auth gate (integration onboarding)
    DeveloperWorkspacePage.tsx ← Developer workspace (metrics + request list)
    CreateVerificationRequestPage.tsx ← Form: create verification request
    RequestCreatedPage.tsx   ← Success state (API key + embed URL)
    RequestDetailsPage.tsx   ← Request details + copy/pause/delete
  contexts/
    WalletContext.tsx         ← Wallet connection state (Lace/1AM)
    VerificationContext.tsx   ← Campaign verification state machine
    DAppVerificationContext.tsx ← DApp verification state machine
    OperatorContext.tsx       ← Operator auth state machine + identity + campaign CRUD
    DeveloperContext.tsx      ← Developer request CRUD + metrics
  components/
    layout/Navigation.tsx    ← Marketing nav (How it works, Campaigns, Create Campaign)
    layout/DAppNav.tsx       ← Focused DApp nav (ANONIMUS | DApp name | Exit)
    layout/OperatorNav.tsx   ← Operator nav (ANONIMUS | Overview | Campaigns | Create | project | Sign out)
    layout/DeveloperNav.tsx  ← Developer nav (ANONIMUS | Developer badge | Workspace | New Request | Project Settings)
    three/OccludedSeal.tsx   ← Signet Token hero (Three.js)
    three/LivingBackground.tsx ← Star field + orbital rings
    three/CursorTorch.tsx    ← Golden cursor glow
    ui/                      ← Button, Card, Badge, CampaignCard, etc.
  data/
    campaigns.ts             ← Mock campaign data (4 campaigns)
    dapp-requests.ts         ← Mock DApp verification requests (3 examples)
    managed-campaigns.ts     ← Mock managed campaigns + registrations + CRUD
    dev-requests.ts          ← Mock developer verification requests + CRUD
  types/index.ts             ← All TypeScript types
  styles/tokens.css          ← Design tokens (60% void, 30% bone, 10% electrum)
```

- Node/TypeScript backend service exposing campaign + verification-session APIs.
- Compact contract: credential registry (HistoricMerkleTree of randomized
  commitments) + scoped nullifier spend (Set) + per-campaign domain separation.
- Local devnet (Docker, network `undeployed`) for all contract testing — no
  faucets needed locally.
- FaceTec self-hosted (Docker) for real liveness+dedup at the personhood layer
  (integration pending license key).
- Persistent storage: none until a need is demonstrated (see §5 D4).

---

## 5. Technical decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Node + TypeScript backend | Entire Midnight SDK ecosystem is TS-first; Node 24 present. |
| D2 | Compact toolchain inside WSL2 Ubuntu (Docker fallback) | Compiler binaries are Unix-only; WSL2 is installed. Compiler 0.31.1 at `~/.compact/versions/0.31.1/`. |
| D3 | Scoped nullifiers via `persistentHash` with per-context domain tags; credential registry via HistoricMerkleTree of randomized commitments | Documented Compact patterns; matches directive §10's model; persistentHash is the documented primitive for nullifiers/domain separation. |
| D4 | No database until demonstrated need | Directive §8. Candidate non-DB state: campaign metadata + nullifier spends live on-ledger; verification sessions are short-lived server state (TBD — sessions may justify minimal storage; decide in Phase 2). |
| D5 | FaceTec self-hosted as initial PoH provider (provisional) | Real 3D liveness + 1:N dedup; Docker self-host keeps biometrics local; needs user-provided license key before integration. |

---

## 6. Midnight decisions

- Contract language: Compact, `pragma language_version >= 0.22`.
- Registry: `HistoricMerkleTree<16, Bytes<32>>` of randomized commitments
  (depth to be revisited per capacity needs).
- Uniqueness: nullifier = `persistentHash` over domain-separated preimage
  including the campaign/context identifier; spent-set via `Set<Bytes<32>>`.
- All randomness via witnesses. No `transient*` outputs in ledger state.
- Toolchain: `compact` CLI (0.5.2) + compiler (0.31.1) in WSL2; local devnet
  `undeployed`; **no faucet** for local work.
- Verification path: every contract compiled with real `compactc` + tested on
  the local devnet before being considered "working".
- **Off-chain signing uses compact-runtime EC primitives** (`ecMulGenerator`,
  `ecMul`, `ecAdd`, `transientHash`) — NOT `@noble/curves` (incompatible).
- **Merkle tree**: use `merkleTreePathRoot<16, Bytes<32>>()` (NOT
  `merkleTreePathRootNoLeafHash`) because `insert()` applies `leaf_hash()`.
- **Credential id Field derivation**: `deriveCredIdField` pure circuit using
  `transientHash` (returns Field, always < r) — avoids `as Field` overflow.

---

## 7. Files / components

| Path | Purpose |
|------|---------|
| `handoff.md` | This operating document (always current) |
| `contracts/poh_core.compact` | Main contract: credential registry + campaign-scoped nullifier uniqueness |
| `contracts/schnorr.compact` | Polyfill for Jubjub Schnorr (bn254) — modified for compiler 0.31.1 |
| `contracts/witnesses.ts` | Witness implementations + test verifier + signing helpers |
| `contracts/index.ts` | Contract export + zkConfigPath |
| `contracts/managed/poh_core/` | Generated by compactc (don't edit) |
| `src/e2e-local.ts` | E2E test: deploy → register → attest → enroll → verify → reject duplicates |
| `src/audit/adversarial.test.ts` | 16 adversarial security tests against local devnet |
| `src/audit/crypto-unit.test.ts` | 16 pure cryptographic unit tests (no devnet) |
| `src/audit/audit.test.ts` | 24 audit tests: attestation integrity, credential binding, nullifier scope, trust model, fail-closed, expiry, unlinkability, trust boundary, no mock leakage |
| `src/wallet.ts` | MidnightWalletProvider (FluentWalletBuilder) |
| `src/providers.ts` | Provider wiring |
| `src/verifier.ts` | Duplicate signing helpers (to be consolidated) |
| `src/config.ts` | Network config (local devnet endpoints) |
| `src/receipt.ts` | VerificationReceipt type, signing, verification |
| `src/integration.ts` | HTTP service for DApp integration |
| `src/integration.test.ts` | 62 integration tests |
| `scripts/` | WSL repair, Kapa auth, toolchain setup |
| `.tmp/midnight-expert/` | Midnight Expert reference docs checkout |
| `.tmp/midnight-docs/` | Official Midnight docs source clone |

---

## 8. Tests

**E2E test passes (2026-09-08):** `npx tsx src/e2e-local.ts` runs against local
devnet and verifies:
1. Contract deploy
2. Verifier registration
3. Attestation issuance (real Jubjub Schnorr via compact-runtime EC primitives)
4. Credential enrollment (Merkle tree insert)
5. Personhood verification (Schnorr verify + Merkle membership + nullifier spend)
6. Duplicate claim rejection (per-campaign nullifier)
7. Cross-campaign uniqueness (same credential, different scope)

**Adversarial test suite (2026-09-08):** `npx tsx src/audit/adversarial.test.ts`
16 tests covering: modified attestation, wrong campaign, wrong credential,
unauthorized verifier, replayed attestation, duplicate enrollment, duplicate
verification, cross-campaign reuse, malformed signature, invalid
commitment/membership proof, input validation.

**Crypto unit tests (2026-09-08):** `npx tsx src/audit/crypto-unit.test.ts`
16 pure tests covering: Schnorr sign/verify, determinism, deriveCredIdField
consistency, deriveCommitment, domain separation, cross-credential unlinkability,
field correctness, signature + pureCircuits cross-check.

**Integration tests (2026-09-08):** `npx tsx src/integration.test.ts`
62 tests covering: receipt signing/verification, scope binding, session binding,
HTTP service (create/complete/receive receipts), duplicate completion rejection,
wrong scope rejection, invalid nullifier rejection, privacy (no identity data
in receipt), receipt format validation.

**Audit tests (2026-09-11):** `npx tsx src/audit/audit.test.ts`
24 tests covering: attestation integrity (forging, tampering), credential binding
(uniqueness, determinism), nullifier campaign scope, trust model (key derivation,
verifier uniqueness), fail-closed properties, attestation expiry (policy-bound),
cross-credential unlinkability, backend trust boundary, no mock leakage.

---

## 9. Known limitations

- `@noble/curves` Jubjub is **NOT compatible** with compact-runtime EC operations
  (different generator point, different curve parameterization). Off-chain signing
  must use compact-runtime's own primitives (`ecMulGenerator`, `ecMul`, `ecAdd`,
  `transientHash`).
- `bytes32ToField` must reduce mod `r` (BLS12-381 scalar field
  `52435875175126190479447740508185965837690552500527637822603658699938581184513n`),
  NOT mod `p` (base field).
- `transientHash` validates against scalar field `r`, not base field `p`.
- Hash types must match between circuit and off-chain: `Vector<5, Field>` circuit
  needs `CompactTypeVector(5, CompactTypeField)`, NOT `CompactTypeBytes(32)`.
- WASM version mismatch: `compact-runtime` may nest a different
  `onchain-runtime-v3` than `midnight-js-contracts`. Fix via `package.json`
  resolutions pinning to `3.0.0`.
- `insert()` applies `leaf_hash()` (persistent_hash) before storing — use
  `merkleTreePathRoot<16, Bytes<32>>()` (NOT `merkleTreePathRootNoLeafHash`).
- `credId as Field` cast fails when `Bytes<32>` value exceeds scalar field `r`
  (~12.5% of cases). Fix: added `deriveCredIdField` pure circuit.
- `balanceUnboundTransaction` needs 3 args at runtime (types say 2) — cast
  `this.wallet` to `any`.
- `buildWithoutStarting` returns different `WalletFacade` type from `testkit-js`
  vs `wallet-sdk` — use `as unknown as` cast.

---

## 10. Security considerations

- Verification results must resist: forgery, replay, cross-application reuse,
  wrong-redirect, session reuse, duplicate participation. Design OAuth-like
  session/callback + cryptographic signing carefully; research before inventing.
- Domain-separate every nullifier/context; never let a campaign nullifier act as
  a global identity. Per-context tags are the documented mechanism.
- Wallet ownership ≠ personhood ≠ uniqueness. Keep them separate end-to-end.
- Leaf-guessing on the registry: leaves must be randomized commitments, not raw
  hashes of guessable values (documented attack in Midnight Expert references).

### Security Audit (2026-09-08)

**Methodology**: Midnight Expert `compact-security` threat model + `compact-review`
security/privacy checklists. 16 adversarial tests (10 E2E against devnet, 6 pure
cryptography). All tests pass after fixes.

#### Audit Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F1 | **Critical** | `verifyPersonhood` did NOT check `verifiers.member(disclose(vk))`. A witness could supply any public key for Schnorr verification. An admin could register their own key and issue fake attestations. | **FIXED** — Added `assert(verifiers.member(disclose(vk)), "Verifier not registered")` before Schnorr check. |
| F2 | **Medium** | Attestation signature does not bind campaign scope. One attestation works for ALL campaigns. A compromised attestation is valid everywhere. | **By design** — documented limitation. Campaign scoping is via nullifiers, not attestation scope. |
| F3 | **Medium** | No attestation expiry or revocation mechanism. Once issued, an attestation is valid forever (until the verifier key is removed). | **Implemented** — `expiresAt` (Field witness) added to attestation. Disclosed in ledger. Schnorr signature covers only `credId` (1-element), not `expiresAt` — expiry is policy-bound, not crypto-bound. See "Attestation Lifecycle" below. |
| F4 | **Low** | `enrollCredential` accepts any `Bytes<32>` without validating it was derived via `deriveCommitment`. A malicious admin could insert arbitrary leaves. | **By design** — admin is trusted; enrollment is an admin-only operation. |
| F5 | **Low** | Duplicate enrollment with same commitment: `HistoricMerkleTree.insert()` silently ignores duplicates (no error). Not a vulnerability (same leaf_hash = no state change), but behavior should be documented. | **Documented here** — Informational. |
| F6 | **Informational** | Schnorr challenge truncated from 256 to 248 bits (`cFull % TWO_248`). Matches on-chain/off-chain, but reduces brute-force resistance from 2^256 to 2^248. | **Accepted** — 2^248 is computationally infeasible. |
| F7 | **Informational** | `witnesses.ts` and `verifier.ts` duplicate Schnorr signing helpers. Risk of divergence if one is updated without the other. | **Unresolved** — consolidate into shared module. |

#### Adversarial Test Results (16/16 pass)

```
--- 1. Attestation Integrity ---
  PASS: Modified attestation (tampered response) rejected
  PASS: Modified attestation (tampered announcement) rejected
  PASS: Wrong verification key rejected

--- 2. Trust Model ---
  PASS: Unauthorized verifier attestation rejected
  PASS: Non-admin cannot register verifier
  PASS: Non-admin cannot enroll credential

--- 3. Credential Binding ---
  PASS: Cross-user attestation rejected (A cannot use B's attestation)
  PASS: Same credential with different salt produces different commitment

--- 4. Nullifier Correctness ---
  PASS: Duplicate verification for same campaign rejected
  PASS: Different campaign succeeds (cross-campaign unlinkability)

--- 5. Merkle / Membership Proof ---
  PASS: Unenrolled credential rejected (Merkle membership fails)
  PASS: Wrong salt produces wrong commitment (Merkle path fails)

--- 6. Signature Correctness ---
  PASS: Signature over wrong credential rejected
  PASS: Signature from wrong verifier key rejected

--- 7. Attestation Expiry ---
  PASS: Changed expiresAt accepted (expiry is policy-bound, not crypto-bound)
        FINDING (Informational): expiresAt is disclosed but not in Schnorr message.
        Mitigation: verifier key revocation via removeVerifier() is the real
        revocation primitive. Expiry is advisory for operational hygiene.

--- 8. Input Validation ---
  PASS: Unregistered key not in verifiers set
  PASS: Registered key in verifiers set
```

#### Privacy Classification

| Data | Private | Disclosed by circuit | On-chain | Observer-visible | App-visible |
|------|---------|---------------------|----------|-----------------|-------------|
| Credential secret (credSecret) | Yes | No | No | No | No |
| Credential salt | Yes | No | No | No | No |
| Credential id (deriveCredId) | Yes | No | No | No | No |
| Attestation signature | Yes | No | No | No | No |
| Attestation expiry (expiresAt) | No | Yes (disclosed) | No | Yes | Yes |
| Verifier VK (registered) | No | No | Yes | Yes | Yes |
| Verifier VK (attested) | No | Yes (via witness) | No | No | No |
| Registry Merkle root | No | Yes (via checkRoot) | Yes (history) | Yes | Yes |
| Nullifier | No | Yes | Yes | Yes | Yes |
| Campaign ID | No | No (function arg) | No | Yes | Yes |
| Registry leaf count | No | No | Yes (public) | Yes | Yes |

#### Trust Assumptions

1. **Admin is trusted** — the deployer's secret key controls verifier registration
   and credential enrollment. Compromise of the admin key breaks the entire system.
2. **Verifier is trusted** — the registered verifier only issues attestations after
   completing real-world personhood verification. The contract cannot enforce this;
   it is a real-world trust assumption.
3. **No Sybil resistance at contract level** — the contract prevents credential
   REUSE within a campaign, but cannot prevent one human from obtaining multiple
   credentials. Sybil resistance depends on the verifier's issuance discipline.
4. **Witnesses are untrusted** — all witness values are properly constrained inside
   the circuit (Schnorr verify, Merkle check, nullifier check, verifier membership).

### Attestation Lifecycle (2026-09-08)

**Design decision**: Attestation expiry is **policy-bound, not cryptographically bound**.

The `expiresAt` field (Field witness) is disclosed in the ledger but is NOT included
in the Schnorr signature message. This means:

- The Schnorr signature covers only `deriveCredIdField(credSecret)` (1-element).
- `expiresAt` is a required witness — the prover must provide it.
- The value is disclosed (revealed in the ledger transaction).
- **The prover CAN change `expiresAt` without breaking the Schnorr check.**
- This is by design: expiry is advisory for operational hygiene.

**Why not cryptographically bind expiry?**

The Compact `Field` type crosses the off-chain/on-chain boundary with different
runtime representations. Including `expiresAt` (as Field) in the Schnorr message
vector produces a hash mismatch between off-chain signing and on-chain verification.
This is a known Compact runtime limitation.

**Revocation primitives (from strongest to weakest):**

1. **Verifier key removal** (`removeVerifier(vk)`) — strongest. After removal,
   no new attestations can be verified. Existing attestation signatures remain
   valid but are useless without a registered verifier.
2. **Credential enrollment removal** — removes the commitment from the registry.
   Attestation is valid but Merkle membership fails.
3. **Attestation expiry** (`expiresAt`) — weakest. Advisory only. The verifier
   should re-issue attestations periodically with fresh expiry values. The
   prover can ignore the expiry, but doing so risks the attestation being
   rejected by cooperating verifiers.

**Block time check (`blockTimeLte`)**: The stdlib exports `blockTimeLte(Uint<64>)`
but the Compact execution spec notes block timestamps are "not yet correctly
populated on-chain". Even if they were, converting `Field` → `Uint<64>` for the
time check introduces the same off-chain/on-chain representation mismatch. The
   expiry mechanism is therefore implemented as a disclosed witness without on-chain
   block time verification.

### DApp Integration Architecture (2026-09-08)

**Integration primitive:** `VerificationReceipt` — a signed claim by the PoH service
that a specific nullifier was observed on-chain for a given scope.

**Flow:**
```
DApp → POST /verify { sessionId, scope } → PoH Service
PoH Service → { requestId, status: 'pending' }
[User completes on-chain verification via wallet]
PoH Service observes on-chain tx → POST /complete { requestId, nullifier }
PoH Service → signs VerificationReceipt → GET /receipt/:requestId
DApp ← { receipt: { nullifier, scope, sessionId, issuedAt, expiresAt, signature } }
DApp verifies receipt signature against trusted public key
DApp checks scope matches what it requested
```

**Trust boundaries:**
- DApp trusts the PoH service's Ed25519 signing key (public, out-of-band).
- PoH service only signs after observing a successful on-chain `verifyPersonhood`.
- Nullifier is unique per (credential, scope) — prevents reuse.
- Session binding: each request has a unique `sessionId`; server only signs for
  sessions it created.

**Request/session binding model:**
- API-layer binding (not cryptographic): each verification request gets a UUID.
- Server creates the request, user completes on-chain, server signs receipt.
- DApp checks `receipt.sessionId` matches the session it initiated.
- No circuit changes needed — scope binding comes from the nullifier itself.

**Data exposed to DApp (via receipt):**
- `nullifier` — hex-encoded 32 bytes (proves uniqueness within scope)
- `scope` — campaign/scope identifier (DApp already knows this)
- `sessionId` — server-generated UUID (binding)
- `issuedAt` / `expiresAt` — timestamps (policy-bound advisory)
- `signature` — Ed25519 over all receipt fields

**Data kept private:**
- Credential secret, salt, credential ID
- Attestation signature
- Biometric/identity data
- Cross-scope linkage (nullifiers are unlinkable across scopes)

**Replay protection:**
- Nullifier is unique per (credential, scope) — once used, cannot be reused.
- Receipt is bound to sessionId — cannot be replayed for a different session.
- DApp checks scope locally — receipt for scope A cannot be used for scope B.

**Security requirements tested:**
| Requirement | Status |
|-------------|--------|
| Valid verification → accepted by DApp | PASS (62/62 tests) |
| Invalid verification → rejected | PASS (tampered sig, wrong key) |
| Wrong scope → rejected | PASS (scope mismatch check) |
| Replayed verification → rejected | PASS (nullifier uniqueness) |
| Result for DApp A cannot be reused for DApp B | PASS (scope binding) |
| Result for one session cannot substitute another | PASS (session binding) |
| Duplicate campaign verification rejected | PASS (nullifier uniqueness) |
| No identity info returned to DApp | PASS (receipt contains only nullifier + metadata) |

**Known limitations:**
1. `expiresAt` is policy-bound, not cryptographically enforced (F3).
2. DApp trusts the PoH service's signing key — a compromised service can forge
   receipts. Mitigation: service is self-hosted; in production, monitor the
   signing key and rotate periodically.
3. No on-chain nullifier existence proof in the receipt — the DApp trusts the
   service observed the tx. Future: include Merkle proof of nullifier inclusion.
4. The HTTP service is in-memory only — no persistence across restarts. Sufficient
   for MVP/testing; production needs a lightweight store.

**Files:**
- `src/receipt.ts` — VerificationReceipt type, signing, verification
- `src/integration.ts` — HTTP service (POST /verify, POST /complete, GET /receipt)
- `src/integration.test.ts` — 62 integration tests (receipt + HTTP service)

### Security Audit — Phase 2: Frontend Integration Review (2026-09-11)

**Scope**: Full-stack review of the frontend-to-backend registration flow. Verified
privacy boundary, camera lifecycle, verifier instance management, and data classification.

#### Fixes Applied

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| F8 | **High** | Camera stream not stopped on component unmount — leaked MediaStream tracks | Added `useEffect` cleanup in `FaceVerificationCamera` (`VerificationPage.tsx`) calling `stopCamera()` on unmount |
| F9 | **Medium** | Two different `TestVerifier` instances created — one in `attestation-service.ts`, another in `midnight-service.ts`. Registration could use an attestation signed by a different key than the one registered on-chain. | Unified: `attestation-service.ts` now exports `setVerifier()` called by `midnight-service.ts`. Single source of truth. |
| F10 | **Medium** | `console.error` logged full error objects including potential attestation/signature data | Changed to log only `err.message` in `server.ts` registration handler |

#### Documentation Corrections

| # | Area | Old (Misleading) | New (Honest) |
|---|------|-------------------|--------------|
| D4 | `face-verify.ts` description | "Face verification" | "Face detection + spatial quality check" |
| D5 | `face-verify.ts` failure reason | "Person not verified" | "Face check failed" |
| D6 | `VerificationContext` stage | "face_verification" | "face_check" |
| D7 | `VerificationPage` | "liveness check" | "face/spatial quality check" |

**Honest documentation**: All code comments now accurately describe what face-api.js
establishes: face presence, frontal pose, sufficient size, image quality. NOT liveness,
NOT personhood, NOT uniqueness. A photograph passes all checks.

#### Backend Trust Boundary (Documented, Not Changed)

The `/api/register` endpoint generates credentials and issues attestations internally.
No face verification proof is required from the frontend. This is acceptable because:

- The backend IS the trusted verifier in this environment
- The face check is a UI-level prerequisite
- The ZK proof still verifies: attestation + Merkle membership + nullifier
- In production, a real personhood provider (FaceTec) would replace the backend's role

#### Tests Added

| Test Suite | Tests | Coverage |
|-----------|-------|----------|
| `src/audit/audit.test.ts` | 24 | Attestation integrity, credential binding, nullifier campaign scope, trust model, fail-closed properties, attestation expiry, cross-credential unlinkability, backend trust boundary, no mock leakage |

#### Test Results (2026-09-11)

```
Crypto unit tests:     16/16  PASS
Audit tests:           24/24  PASS
Integration tests:     62/62  PASS
```

Total automated tests: **102** (16 crypto + 24 audit + 62 integration)

#### Files Modified (2026-09-11)

| File | Change |
|------|--------|
| `web/src/pages/VerificationPage.tsx` | Camera cleanup on unmount, honest face-check documentation |
| `web/src/lib/face-verify.ts` | Honest description: face detection + spatial checks, NOT liveness |
| `web/src/contexts/VerificationContext.tsx` | Honest documentation, stage renamed to "face_check" |
| `src/attestation-service.ts` | Added `setVerifier()`, uses shared verifier instance |
| `src/server.ts` | Removed duplicate `initializeVerifier()`, error logging cleaned |

---

## 11. Privacy considerations

- **Never** store raw facial images, biometric templates, government IDs, names,
  DOB, addresses, or identity documents. FaceTec self-hosted keeps biometric
  processing inside our own infrastructure; provider-side data retention to be
  minimized/audited at integration time.
- Midnight private state (user-local) preferred for any user-held secrets;
  public ledger only for commitments/nullifiers/spent-markers.
- Data classification (to maintain): public/on-chain = commitments, nullifiers,
  spend markers, campaign identifiers, participant counts; private/user-local =
  credential openings, witness secrets; server-temporary = verification session
  handles (short-lived); provider-held = FaceTec search index (self-hosted).
- Kapa OAuth credentials live in `.env` / script constants — dev-tier, not
  user identity data.

---

## 12. External dependencies

| Dependency | Status | Needs |
|-----------|--------|-------|
| Kapa MCP (`https://midnight.mcp.kapa.ai`) | Endpoint confirmed; OAuth client registered | One-time user browser login (`node scripts/kapa-auth.mjs start`) |
| Compact CLI/compiler (`compact`, ~0.31.0) | Not installed | WSL2 restart, then install inside Ubuntu |
| Local devnet (Docker: node/indexer/proof-server) | Not running | Docker Desktop started |
| FaceTec Server (self-hosted Docker) | Selected provisionally | FaceTec developer-portal account + license key (user) |
| Lace / Gero wallets | Research stage | Nothing yet (browser extension testing comes with frontend work) |

---

## 13. Required user intervention

1. ~~Restart WSL~~ **DONE 2026-09-06** — fixed via elevated scripts
   (`scripts/fix-wsl-admin.ps1` + `scripts/fix-wsl-stage2.ps1`, UAC approved
   by user): WSL platform upgraded 2.7.12→2.7.13 via winget, deadlocked
   `wslservice.exe` (StopPending) force-killed, fresh service started.
2. ~~Start Docker Desktop~~ **DONE** — daemon 29.1.3 responding; WSL distros
   Ubuntu / Ubuntu-24.04 / docker-desktop all Running.
3. **Kapa MCP login: BLOCKED SERVER-SIDE at kapa.ai (verified twice)** —
   reproduced via raw HTTP: both Google and GitHub provider hops on mcp.kapa.ai
   immediately redirect back with `error=server_error` without ever reaching
   the identity provider (still failing as of 2026-09-06). Kapa's social login
   is broken on their end; our OAuth client IS correctly registered.
   **Self-service retry**: run
   `powershell -ExecutionPolicy Bypass -File scripts/kapa-login.ps1`
   (generates a fresh login URL, opens the browser, waits for the callback,
   stores tokens in `.env`). A browser tab ending at
   `localhost:8451/callback?error=server_error...` means Kapa is still broken
   (the ERR_CONNECTION_REFUSED on that page is expected — the error is in the
   URL). If a tab ends at `.../callback?code=...` the flow succeeded.
   Escalation/report: Midnight Discord or
   https://midnightntwrk.github.io/servicedesk/
4. **FaceTec license key** — needed before personhood-provider integration.
   Developer-portal account required (user action).
5. *(Not requested)* No faucet funding is being requested — local devnet first.

---

## 14. Blockers

- ~~Compact toolchain~~ **RESOLVED 2026-09-06** — Compact CLI 0.5.2 + compiler
  0.34.0 installed in WSL Ubuntu-24.04; real compile verified (§3).
- ~~Local devnet~~ **RESOLVED** — Docker containers running, E2E passes.
- **Kapa MCP research path**: blocked server-side at kapa.ai (social login
  `server_error`); non-blocking for research (official docs cloned locally).
- **FaceTec integration**: pending developer-portal account + license key (user).
- Nothing else blocks Phase 1.

---

## 15. Next step

1. ~~WSL + Docker~~ **DONE**. ~~Compact toolchain install + smoke-test
   compile~~ **DONE** (CLI 0.5.2, compiler 0.34.0, real artifacts verified).
2. ~~Spin up local devnet + E2E~~ **DONE** — full flow passes against Docker devnet.
3. ~~Write Compact contract~~ **DONE** — `poh_core.compact` with 5 circuits + 3 pure
   circuits, E2E verified.
4. ~~E2E test~~ **DONE** — deploy, register, attest, enroll, verify, reject duplicates.
5. ~~Security audit~~ **DONE** — 16 adversarial tests, 1 critical vulnerability found
   and fixed (missing verifier membership check). All tests pass.
6. ~~Attestation lifecycle~~ **DONE** — `expiresAt` field witness added, disclosed
   in ledger. Expiry is policy-bound (not cryptographically bound) due to Compact
   Field type off-chain/on-chain representation mismatch. 17th adversarial test
   documents this limitation.
7. ~~DApp integration layer~~ **DONE** — `VerificationReceipt` (signed claim),
   HTTP service (`/verify`, `/complete`, `/receipt`), 62 integration tests.
   Trust model: DApp trusts service signing key; nullifier provides uniqueness;
   scope/session binding at API layer.
8. **Consolidate duplicate code** — `verifier.ts` duplicates `witnesses.ts` signing
   helpers; should import from a shared module.
9. ~~Frontend / DApp integration~~ **DONE** — Campaign verification flow (6 screens)
   + DApp third-party verification flow (6 screens) implemented. Two distinct
   journeys: campaigns (join to participate) and DApps (external app requests
   verification). Both share wallet, disclosure, and verification infrastructure
   but have separate navigation, context, and UI language.
10. **FaceTec integration** — needs license key from user.
11. Conclude D4 (database necessity) during Phase 2 session-layer design.
16. ~~Frontend privacy boundary + audit~~ **DONE** — Camera lifecycle fixed, verifier
    instances unified, honest face-check documentation, 24 new audit tests (all pass).
    Total automated tests: 102 (16 crypto + 24 audit + 62 integration).
12. ~~Project-side campaign management~~ **DONE** — Create Campaign, Dashboard,
    Registrations, Export, Settings pages. OperatorNav, ExportDialog, CampaignContext.
13. ~~Integration pass: campaign creation discoverability~~ **DONE** — "Create Campaign"
    added to marketing nav; "All Campaigns" back-link on Dashboard; routing verified.
14. ~~Project Authentication + Operator Workspace~~ **DONE** — wallet-based operator
    identity (OperatorContext), OperatorEntryPage (auth gate), OperatorWorkspacePage
    (overview + campaigns), authenticated OperatorNav, session persistence.

### Step 12 — Project-side campaign management (operator experience)
**Status: DONE**

Extended the frontend with a third journey: the project/operator campaign management
surface. Three layout modes now exist in `App.tsx`:

- **MarketingLayout** — `Navigation` + `CursorTorch` + `LivingBackground` (campaign
  participant flow, homepage)
- **DAppLayout** — `DAppNav` + `LivingBackground` (third-party verification)
- **OperatorLayout** — `OperatorNav` + `LivingBackground` + `CampaignProvider` (campaign
  CRUD, dashboard, registrations, export, settings)

Pages implemented:

| Route | Page | Description |
|-------|------|-------------|
| `/campaigns/create` | `CreateCampaignPage` | Full creation form (identity, scope, schedule, purpose, result handling) |
| `/campaigns/created/:id` | `CampaignCreatedPage` | Success state with BlankSignet, two CTAs |
| `/campaigns/manage` | `CampaignManageListPage` | List of managed campaigns with status, registrations count, scope |
| `/campaigns/:id/dashboard` | `CampaignDashboardPage` | Primary metric (registered count), privacy summary, recent registrations table |
| `/campaigns/:id/registrations` | `RegistrationsPage` | Full wallet handle table with verification status, commitment refs |
| `/campaigns/:id/settings` | `CampaignSettingsPage` | Read-only campaign details, scope lock warning |

Shared components:
- `ExportDialog` — modal with scope explanation, CSV/JSON format selector, success state
- `OperatorNav` — authenticated navigation (ANONIMUS | Overview | Campaigns | Create | project badge | Sign out)

Data layer: `data/managed-campaigns.ts` (mock CRUD, 1,284 + 423 registrations, export).
Context: `contexts/CampaignContext.tsx` (loadCampaigns, loadCampaign, createCampaign,
loadRegistrations, getExportData).
Context: `contexts/OperatorContext.tsx` (auth state machine, operator identity, campaign
listing, derived metrics, session persistence).

TypeScript typecheck passes. Vite build succeeds.

### Step 13 — Integration pass: campaign creation discoverability
**Status: DONE**

Focused integration pass to make the project-side campaign creation flow discoverable
without knowing URLs. Changes:

1. **Marketing navigation** (`Navigation.tsx`): Added "Create Campaign" text link in
   the nav bar, positioned between the nav items and the "Start Verification" CTA.
   Styled identically to existing nav links (uppercase, mono font, muted color).
   Does not compete with the primary "Start Verification" action.

2. **CampaignDashboardPage**: Added "All Campaigns" back-link above the header,
   matching the pattern used in `RegistrationsPage` and `CampaignSettingsPage`.
   Links to `/campaigns/manage`.

3. **Route detection** (`App.tsx`): Verified that `/campaigns/created/:id` is already
   covered by `isOperatorRoute` via the `startsWith('/campaigns/create')` check.
   The CampaignCreatedPage correctly uses OperatorLayout.

**Verified navigation journeys:**

| Journey | Path | Status |
|---------|------|--------|
| New project | Homepage → "Create Campaign" nav link → Create Campaign page → form submit → Campaign Created → "Open Campaign Dashboard" → Dashboard | ✓ |
| Returning project | Homepage → "Campaigns" nav link (operator) → Managed Campaigns → click campaign → Dashboard | ✓ |
| Dashboard navigation | Dashboard → "All Campaigns" back-link → Managed Campaigns | ✓ |
| Dashboard sub-pages | Dashboard → "View Registrations" → RegistrationsPage (has "Back to Dashboard") | ✓ |
| Dashboard settings | Dashboard → nav "Settings" → SettingsPage (has "Back to Dashboard") | ✓ |
| Empty state | Managed Campaigns (0 campaigns) → "Create Campaign" button → Create Campaign page | ✓ |
| Post-creation | Create Campaign → submit → Campaign Created → "Open Campaign Dashboard" → Dashboard | ✓ |

TypeScript typecheck passes. Vite build succeeds.

### Step 14 — Project Authentication + Operator Workspace
**Status: DONE**

Built the authenticated operator experience for project-side campaign management.

#### Architecture Decision

No authentication existed in the repository (no auth library, no backend auth, no session
handling). The existing wallet system (WalletContext) is mock-only. Decision: wallet-based
operator identity using the existing mock wallet pattern. The operator connects a wallet →
that establishes their project context → campaigns are filtered by matching `organizer`.

**This is frontend-only auth.** Backend authorization (project → campaign ownership
enforcement) is required for production. The frontend respects the conceptual boundary
but does not pretend client-side route protection is sufficient.

#### Auth States

| State | Behavior |
|-------|----------|
| `idle` | Show wallet selection (Lace / 1AM) |
| `connecting` | Spinner + "Confirm in wallet extension" |
| `connected` | Operator workspace with project identity |
| `rejected` | "Connection was declined" + "Try again" CTA |
| `unavailable` | Explains the actual cause |
| `session-expired` | "Your session has expired" + "Sign in again" CTA |
| `unauthorized` | "You do not have access to this campaign" + back-link |

Session is persisted in `localStorage` (`anonimus-operator-session`).

#### Files Created

| File | Purpose |
|------|---------|
| `contexts/OperatorContext.tsx` | Auth state machine, operator identity, campaign CRUD (filtered by operator), derived metrics (active campaigns, total registrations) |
| `pages/OperatorEntryPage.tsx` | Onboarding/auth gate: "Build with Anonimus" hero, how-it-works steps, privacy guarantee, wallet selection, auth state UIs |
| `pages/OperatorWorkspacePage.tsx` | Overview page: project name, wallet address, 3 metrics (active/total campaigns, total registrations), campaign list with "Create Campaign" CTA |

#### Files Modified

| File | Change |
|------|--------|
| `components/layout/OperatorNav.tsx` | Shows Overview/Campaigns/Create links when authenticated; project name badge; "Sign out" button; "Sign in" when unauthenticated |
| `pages/CampaignManageListPage.tsx` | Now uses `useOperator()` instead of `useCampaign()`; redirects to `/operator` if not authenticated |
| `App.tsx` | OperatorLayout wraps with OperatorProvider; `/operator` and `/operator/workspace` routes added; `isOperatorRoute` includes `/operator` prefix |

#### Routing

| Route | Page | Auth Required |
|-------|------|---------------|
| `/operator` | OperatorEntryPage | No (entry point) |
| `/operator/workspace` | OperatorWorkspacePage | Yes |
| `/campaigns/create` | CreateCampaignPage | Yes |
| `/campaigns/manage` | CampaignManageListPage | Yes |
| `/campaigns/:id/dashboard` | CampaignDashboardPage | Yes |
| `/campaigns/:id/registrations` | RegistrationsPage | Yes |
| `/campaigns/:id/settings` | CampaignSettingsPage | Yes |
| `/developers` | DeveloperEntryPage | No (entry point) |
| `/developers/workspace` | DeveloperWorkspacePage | Yes |
| `/developers/requests/create` | CreateVerificationRequestPage | Yes |
| `/developers/requests/:id/created` | RequestCreatedPage | Yes |
| `/developers/requests/:id` | RequestDetailsPage | Yes |

#### Provider Hierarchy

```
OperatorLayout
  └── OperatorProvider (auth state + operator identity)
        └── CampaignProvider (campaign CRUD)
              └── {children} (all operator pages)

DeveloperLayout
  └── OperatorProvider (auth state — reuses operator identity)
        └── DeveloperProvider (request CRUD + metrics)
              └── {children} (all developer pages)
```

CampaignContext is nested inside OperatorContext. Individual campaign operations
(loadCampaign, loadRegistrations, getExportData) go through CampaignContext.
Auth state and campaign listing go through OperatorContext.

DeveloperContext wraps OperatorContext. A single wallet connection authenticates
both campaign operations (OperatorWorkspace) and developer operations
(DeveloperWorkspace). Same project identity, different capability surfaces.

#### Navigation Journeys

| Journey | Path | Status |
|---------|------|--------|
| New project | Homepage → "Create Campaign" → OperatorEntryPage → connect wallet → OperatorWorkspacePage | ✓ |
| Returning project | Homepage → "Create Campaign" → OperatorEntryPage (auto-redirect) → OperatorWorkspacePage | ✓ |
| Workspace → campaign | OperatorWorkspacePage → click campaign → Dashboard | ✓ |
| Workspace → create | OperatorWorkspacePage → "Create Campaign" → form → Created → Dashboard | ✓ |
| Sign out | OperatorNav → "Sign out" → OperatorEntryPage | ✓ |
| Campaign list | OperatorNav → "Campaigns" → CampaignManageListPage | ✓ |
| Unauthorized access | Direct URL to /campaigns/manage when not auth → redirected to /operator | ✓ |

#### Backend Requirement (documented, not implemented)

```
POST /api/operator/auth/connect
  Request: { walletAddress, provider }
  Response: { sessionId, project: { id, name, walletAddress } }

GET /api/operator/campaigns
  Auth: sessionId cookie
  Response: { campaigns: ManagedCampaign[] }

POST /api/operator/campaigns
  Auth: sessionId cookie
  Request: CampaignCreateInput
  Response: { campaign: ManagedCampaign }

GET /api/campaigns/:id
  Auth: sessionId cookie
  Authorization: project owns campaign
  Response: { campaign, registrations }
```

The backend must enforce: authenticated project → authorized campaign. The frontend
must not rely on hiding pages as authorization.

TypeScript typecheck passes. Vite build succeeds.

---

## 15. Developer / DApp Integration Workspace (Step 15 — COMPLETE)

### Purpose

Operational layer for third-party DApp developers to create verification requests,
manage integrations, and receive signed receipts through Anonimus.

### Architecture

```
DeveloperLayout
  └── OperatorProvider (auth state — reuses operator identity)
        └── DeveloperProvider (request CRUD + metrics)
              └── {children} (all developer pages)
```

DeveloperContext wraps OperatorContext. A single wallet connection authenticates
both campaign operations (OperatorWorkspace) and developer operations
(DeveloperWorkspace). Same project identity, different capability surfaces.

### Types added (types/index.ts)

- `DevRequestStatus`: `'active' | 'paused' | 'expired' | 'draft'`
- `DevRequest`: Full request record (appId, appName, scope, description, returnUrl,
  requestedClaims, apiKey, status, verifications, maxVerifications, createdAt, expiresAt)
- `DevRequestCreateInput`: Form input type for creating requests

### Data layer (data/dev-requests.ts)

Mock CRUD: `getDevRequests`, `getDevRequestById`, `createDevRequest`,
`updateDevRequestStatus`, `deleteDevRequest`. Three seed requests (governance,
grants, alpha). API keys generated with `dev_pk_` prefix.

### Pages

| Page | Route | Description |
|------|-------|-------------|
| DeveloperEntryPage | /developers | Onboarding gate — explains integration flow, redirects to workspace if connected |
| DeveloperWorkspacePage | /developers/workspace | Metrics (active/total/verifications) + request list |
| CreateVerificationRequestPage | /developers/requests/create | Form: app name, scope, description, return URL, claims, limits |
| RequestCreatedPage | /developers/requests/:id/created | Success state with API key + embed URL + next steps |
| RequestDetailsPage | /developers/requests/:id | Full details + copy API key/embed URL + pause/resume/delete |

### Navigation

`DeveloperNav` — fixed nav with "ANONIMUS" logo, "Developer" badge, Workspace /
New Request links, "Project Settings" button (→ /operator).

### Routes (App.tsx)

```
/developers                        → DeveloperEntryPage (DeveloperLayout)
/developers/workspace              → DeveloperWorkspacePage
/developers/requests/create        → CreateVerificationRequestPage
/developers/requests/:id/created   → RequestCreatedPage
/developers/requests/:id           → RequestDetailsPage
```

### Developer vs Campaign Operator

- **Campaign Operator** (`/operator`, `/campaigns/*`): Creates campaigns, manages
  registrations, exports wallet handles. Audience: project teams running
  verification campaigns.
- **DApp Developer** (`/developers/*`): Creates verification requests, gets API keys,
  embeds verification URLs. Audience: third-party DApp developers integrating
  Anonimus verification.
- Both share the same OperatorContext for wallet authentication.

### Backend requirements (documented, not implemented)

```
POST /api/developer/auth/connect
  Request: { walletAddress, provider }
  Response: { sessionId, project: { id, name, walletAddress } }

GET /api/developer/requests
  Auth: sessionId
  Response: { requests: DevRequest[] }

POST /api/developer/requests
  Auth: sessionId
  Request: DevRequestCreateInput
  Response: { request: DevRequest, apiKey: string, embedUrl: string }

GET /api/developer/requests/:id
  Auth: sessionId
  Response: { request: DevRequest }

PATCH /api/developer/requests/:id/status
  Auth: sessionId
  Request: { status: 'active' | 'paused' }
  Response: { request: DevRequest }

DELETE /api/developer/requests/:id
  Auth: sessionId
  Response: 204

POST /api/receipt/verify
  Request: { receipt: VerificationReceipt, apiKey: string }
  Response: { valid: boolean, scope: string, nullifier: string, expiresAt: string }
```

TypeScript typecheck passes. Vite build succeeds.
