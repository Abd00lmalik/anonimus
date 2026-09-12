# Anonimus Deep Research Brief
## On-Device Face Verification + Midnight Privacy Architecture

**Status:** Research complete  
**Date:** 2026-09-07  
**Sources:** Uniquity GitHub README + docs, face-api.js / vladmandic official docs, Zama fhEVM docs, Midnight docs (locally cloned from midnightntwrk/midnight-docs), Midnight Expert compact-core + core-concepts references, zk-loan tutorial, DApp Connector API spec, WebAuthn/FIDO2 references, deepfake/liveness research

---

## Executive Verdict

**YELLOW — conditionally viable, with a hard architectural boundary.**

We **can** build a real, privacy-preserving Proof-of-Humanity + Uniqueness service using on-device face processing and Midnight's ZK primitives, **but** we cannot make the face verification itself trustless. The biometric side has a genuine security boundary that only external provider attestation (or at minimum a server-side verification pass) can close against a malicious or modified client. The "our own tech, fully client-side, no third party" vision fails at the client-compromise layer, not at the Midnight layer.

**What is GREEN:**
- Midnight can carry the uniqueness, privacy, and verification-result machinery exactly as envisioned.
- The zk-loan attestation pattern in the official Midnight docs is a near-perfect blueprint: a trusted off-chain signer produces a cryptographic attestation that the Compact circuit verifies, with the underlying data never disclosed.
- Campaign-scoped uniqueness is a solved problem on Midnight using domain-separated `persistentHash` nullifiers + a spent `Set`, exactly per the compact-core patterns reference.
- Wallet integration is real and documented: Lace injects a DApp Connector API (`window.midnight.mnLace`) that a DApp uses to connect, read state, and submit transactions. Gero also has a Midnight wallet. J**AM (1AM) is referenced alongside Lace in official docs as a supported wallet. The DApp Connector spec is stable (v4.0.1 on mainnet/preprod).
- Local development is fully working: Compact CLI 0.5.2 + compiler 0.34.0 installed and verified with a real compile; devnet up (node :9944, indexer :8088, proof-server :6300, network `undeployed`). No faucet needed for local devnet.

**What is YELLOW:**
- On-device face embedding extraction is real and runs entirely in the browser (face-api.js / vladmandic fork on TensorFlow.js, or ONNX Runtime Web + WebGPU with a stronger model). The embedding never needs to leave the device in raw form.
- Local biometric comparison to establish "one human, one credential" is theoretically possible using a fuzzy extractor / secure sketch approach, but it is hard to make sound and is not available off-the-shelf for faces in the browser. The practical path is a **credential issuance** model: a real verifier establishes one-human-one-credential, and Midnight proves possession/validity of that credential.

**What is RED:**
- Client-side-only face verification with no external attestation is **not secure**. A malicious user can modify the JavaScript, bypass the ML, and return `verified = true` — unless something outside the user's control vouches for the result. This is the fatal flaw in "our own tech, no provider."
- Fully homomorphic encrypted similarity comparison (Uniquity's v2 plan) does not solve the client-compromise problem either; it solves a different problem (comparing two encrypted embeddings server-side), which is itself hard and depends on Zama fhEVM's performance characteristics.
- Browser/device integrity attestation (Play Integrity, WebAuthn, TEE remote attestation) is **not** a general-purpose solution for a public web DApp — it is gated to specific platforms, specific apps, or specific authenticators, and does not cover a generic browser user on desktop.

**Bottom line:** The right architecture is **hybrid**:
1. A real personhood/face verification step — either a third-party provider (FaceTec self-hosted is the leading candidate; or a smaller/ZK-friendly provider) **or** an Anonimus-operated verification service that runs server-side face+liveness checks and issues a signed attestation — establishes "this human is real and unique."
2. That attestation is what flows into Midnight, not raw biometrics.
3. Midnight handles: credential privacy, campaign/app-scoped uniqueness, zero-knowledge verification results, signed/cryptographic callbacks to customer DApps.

This keeps biometric data out of Anonimus's central systems (which is the core privacy goal) while not pretending the face layer is trustless when it isn't.

---

## 1. How Uniquity Actually Works

### 1.1 What we can confirm from the public-facing README + docs

Uniquity (Femtech-web) is a **privacy-first identity + campaign submission layer on an fhEVM (Zama) chain**, not on Midnight. Its README and docs are the only public-facing material available; the actual source repo is private (`your-org/uniquity` in the README's clone instructions — this is a template placeholder, not the real origin), so we cannot audit the implementation directly. **Source access is UNVERIFIED for the live repo; everything here is based on the published README/description and the fhEVM/Zama primitives it cites.** We treat the README as STRONG INFERENCE for the design intent, not as confirmed implementation audit.

### 1.2 Face processing

Per the README, Uniquity's face pipeline is:

1. **Camera feed** → **face-api.js** (client-side) → **facial embedding**.
2. The embedding is **quantized to 4 × uint64 chunks**.
3. Those chunks are **FHE-encrypted client-side** (Zama fhEVM client).
4. The encrypted chunks are sent to the chain via `proveHumanity(chunk0..3, inputProof, bucketId)`.

The README says "facial embeddings are computed locally on your device" and "embeddings are FHE-encrypted before leaving your browser." It also says "no biometric data stored in plaintext" and "smart contract stores encrypted embeddings without ever decrypting them."

**What this means technically:**
- face-api.js (or its maintained fork) runs in the browser via TensorFlow.js. It produces a face descriptor (a feature vector, commonly 128-dimensional for the recognition model). The README's "4 × uint64" suggests they quantize the descriptor into 256 bits total — this is a **coarse, lossy** representation, not a full-fidelity embedding. **CONFIRMED**: the embedding is generated locally. **STRONG INFERENCE**: raw camera frames do not need to leave the browser for embedding extraction; the model runs in-browser.

**What this does NOT tell us (and the README does not claim):**
- Whether raw selfies/video are uploaded anywhere (the README says no, but a private repo could differ).
- What face detector / model is actually used (SSD Mobilenet V1 ~6MB, Tiny Face Detector ~200KB, or MTCNN — face-api.js supports multiple).
- Whether the embedding is stored only on-chain, or cached/offloaded anywhere.
- Whether the embedding is "encrypted" only in transit or also at rest.
- Whether the frontend can be tampered with (it can — see §8, §13).

### 1.3 What Uniquity means by "human verification"

The README's own language is precise in one place and loose in others:

- **CONFIRMED (v1, current):** "Instant verification" — a user submits an FHE-encrypted embedding and is marked verified immediately. There is **no comparison** in v1. There is **no uniqueness check** in v1. The README explicitly says: "Current v1 verifies users instantly upon submission. The full comparison flow below will be enabled in v2."
- So v1 **does not prove uniqueness**. It proves "a user submitted something that looks like a face embedding and chose to be marked verified." That is **not** personhood — it is self-attestation with FHE wrapping.
- **v2 (planned, not live):** "Encrypted similarity comparison" via an off-chain FHE comparison service that computes Manhattan distance (L1) between the new encrypted embedding and stored encrypted embeddings, with a threshold of 400,000 (configurable), across 8 buckets. The result is decrypted via `makePubliclyDecryptable → publicDecrypt → checkSignatures` using Zama's relayer + KMS.

**What Uniquity v1 actually provides:**
- **Face detection**: yes, implicitly (the embedding comes from a face detector).
- **Face recognition / matching**: **no in v1**; planned in v2 via FHE Manhattan distance.
- **Liveness**: **not stated in v1**; the README does not mention liveness, blink, challenge-response, or anti-spoofing anywhere in the v1 description. The v2 sequence diagram also does not include a liveness step. This is a significant gap. **UNVERIFIED but strongly inferred**: no meaningful liveness in v1.
- **Identity verification**: **no** — there is no tying to a government ID or known identity.
- **Proof of Humanity / personhood**: **no** — v1 is self-attestation; v2 aims for "one human = one account" via encrypted similarity, which is a uniqueness claim, not an independent personhood attestation.

**Conclusion:** Uniquity's current published design is **not** a real Proof-of-Humanity system. It is a privacy-preserving identity + submission layer whose **uniqueness guarantee is aspirational (v2)** and whose **personhood guarantee is absent (v1)**. This is consistent with the brief's directive to be skeptical.

### 1.4 Uniqueness implementation

**v1 (current):**
- No cryptographic uniqueness. A user is marked verified on first submission. The README says "already verified users cannot re-verify" — this is **state-based rejection**, not a biometric similarity check. It prevents the same wallet from re-verifying, but says nothing about whether a different wallet could present a similar face and be treated as a different human.
- This is the same weakness Anonimus must avoid: **wallet-bound state ≠ human-bound uniqueness.**

**v2 (planned):**
- Encrypted similarity via FHE: off-chain service fetches encrypted profiles, computes L1 distance homomorphically, returns an encrypted distance, which is then made publicly decryptable and finalized with a KMS signature proof.
- The threshold (400,000 L1 over 256 bits) is the "same human" decision boundary.
- Bucket-based organization (8 buckets) is for scalability: comparisons are scoped to a bucket to avoid comparing against all stored profiles.

**What this does and does not solve:**
- It addresses "did this new embedding match any previously stored embedding" — i.e., **duplicate detection**.
- It does **not** address "did the person who submitted this embedding actually present a live, real face to a trusted verifier" — that trust anchor is still missing unless the embedding issuance itself is trusted.
- FHE comparison is computationally heavy; Zama's fhEVM operations are roughly 10× slower than plaintext per public reporting, and off-chain FHE computation is what Uniquity v2 leans on for scalability. **STRONG INFERENCE**: on-chain FHE per-candidate comparison at scale would be impractical; the off-chain service model is the realistic path. This is consistent with the FHE performance literature (Duality, Zama reports).

### 1.5 Security weaknesses in Uniquity's model (as described)

1. **Client compromise:** The face-api.js pipeline runs in JavaScript in the user's browser. Nothing in the README binds the embedding to a trusted execution environment or a signed attestation from a verifier. A modified client could return an arbitrary "embedding" (or skip the camera entirely) and still submit an FHE-encrypted blob. **This is the same class of problem Anonimus faces.**
2. **Photo / video / screen replay:** Without liveness, a static photo or a replayed video of a real person can produce a usable embedding. face-api.js alone does not detect this.
3. **Deepfakes / injected camera feeds:** Modern deepfake and camera-injection attacks (see §5, §8) can produce a live-looking feed without a real person. Passive or active liveness is required; face-api.js offers none.
4. **Embedding theft / reuse:** If an embedding (or its FHE ciphertext) is captured, it could be reused in a different context unless there is context binding (nullifier/scope). Uniquity v1's "already verified users cannot re-verify" is wallet-scoped, not campaign-scoped — relevant to Anonimus's requirement.
5. **Multiple devices / multiple wallets:** A single human with two devices or two wallets can create two verified profiles unless the underlying biometric comparison is sound and the credential is human-bound. v1 does not address this.
6. **Trust in the FHE comparison result:** v2's decrypted distance is trusted if the KMS/relayer is trusted; the KMS signature is the trust anchor there. It does not self-certify.

**Net:** Uniquity is a useful reference for the *privacy-preserving storage* pattern (FHE-encrypted biometrics on-chain) and the *encrypted campaign submission* pattern, but it does **not** solve the core personhood + client-integrity problem any better than Anonimus would. It is a peer facing the same hard problem, with a different (FHE) cryptographic approach.

---

## 2. What Uniquity Gets Right

**CONFIRMED / STRONG INFERENCE:**

1. **Local embedding extraction is the right first step.** Generating the face descriptor on the user's device and never sending raw images to a central server is consistent with the privacy goal. This is feasible today with browser ML.
2. **FHE-encrypted storage is a credible privacy mechanism for biometric templates.** Storing encrypted embeddings on-chain (or in a trusted service) without plaintext access is a defensible design. The tradeoff is performance and complexity.
3. **Encrypted campaign submissions (AES + FHE-wrapped key)** is a clean separation: submissions are encrypted to the campaign admin, not publicly visible. This is a good pattern for Anonimus's campaign mode (eligibility + uniqueness), though Anonimus's MVP does not need reward distribution.
4. **Bucket-based scalability** is a sensible engineering choice for any 1:N comparison, whether FHE or otherwise.
5. **The separation of "verification" from "submission" into two contracts/systems** is architecturally clean. For Anonimus, this maps to: PoH credential/attestation system separate from campaign participation/uniqueness system.

---

## 3. What Uniquity Does NOT Solve

**CONFIRMED from the published description:**

1. **Personhood in v1.** v1 marks users verified on self-submission. It does not independently establish that the submitter is a real human.
2. **Liveness / anti-spoofing.** Not addressed in the v1 description; not clearly addressed in the v2 flow either.
3. **Client integrity.** No mechanism prevents a modified frontend from submitting a fabricated "embedding."
4. **Cross-wallet / cross-device uniqueness in v1.** Wallet-scoped rejection only.
5. **Independent trust anchor.** The system's security ultimately rests on the assumption that the submitted embedding is genuine, which is not enforced by anything outside the client.
6. **Midnight integration.** Uniquity targets fhEVM, not Midnight. Its cryptographic approach (FHE ciphertexts on-chain) does not directly transfer to Compact/Midnight, which uses ZK proofs over private state, commitments, nullifiers, and Merkle trees — a different privacy model. Anonimus should not copy the FHE-on-chain approach; it should use Midnight's native primitives.

---

## 4. Face Verification Technology Options

### 4.1 Options considered

| Technology | Where it runs | Models / approach | Liveness | Browser support | Mobile support | Privacy (local?) | Maturity | Notes |
|---|---|---|---|---|---|---|---|---|
| **face-api.js (original)** | Browser (TF.js) | SSD Mobilenet V1 ~6MB, Tiny Face Detector ~200KB, face descriptor (ResNet-like, 128-d) | None built-in | Good (WebGL) | Works but heavy | Yes (local) | Aging; original repo unmaintained | Simple, widely used, but aging and no liveness |
| **vladmandic/face-api (fork)** | Browser / Node (TF.js) | Updated TF.js compat, same detectors + descriptor, age/gender/emotion | None built-in | Good | Works | Yes (local) | Maintained longer than original, now superseded by author's newer work | Better TF.js compat; still no liveness |
| **MediaPipe (Face Detection / Face Mesh)** | Browser (TF.js) / native | Lightweight face detection + 468-landmark mesh | Can support landmark-based challenge-response (head pose, blink) but not robust anti-spoofing alone | Good | Strong (native SDKs) | Yes (local) | Mature, actively maintained | Good for landmark/geometry; not a face-recognition/embedding solution by itself |
| **TensorFlow.js + custom model** | Browser (TF.js, WebGL/WebGPU) | Anything you can convert (e.g., ArcFace, FaceNet-style) | Depends on model; can add liveness model | Good | Good | Yes (local) | Depends on model | Flexible; you bring the model |
| **ONNX Runtime Web (WebGPU/WASM)** | Browser (WebGPU where available, else WASM) | Any ONNX model (e.g., InsightFace-style recognition, anti-spoofing nets) | Can run dedicated anti-spoofing/liveness models | Good with WebGPU; WASM fallback | Good with WebGPU; varies | Yes (local) | Mature runtime; model-dependent | Best current path for stronger models in-browser; WebGPU gives real performance |
| **CompreFace / DeepFace (server-side)** | Server (Python) | Multiple backends (VGG-Face, FaceNet, ArcFace, Dlib, OpenFace, SFace); InsightFace is strong | Some models/pipelines include anti-spoofing | N/A | N/A | **No** — server-side | Mature | Strong recognition, but server-side = biometric data leaves device; not our preferred architecture |
| **InsightFace (server/SDK)** | Server / native SDK | ArcFace-based, strong accuracy; self-hosted server available | Anti-spoofing models exist | N/A | N/A | **No** — server-side if self-hosted | Strong, actively maintained | Excellent recognition; server-side unless you port to WASM/ONNX — non-trivial |
| **LocalAI face recognition** | Self-hosted server | Built-in vector store, 1:1 verification, 1:N identification, embedding | Not a primary liveness product | N/A | N/A | **No** — server-side | Convenience layer | Useful as a self-hosted convenience, but still centralizes biometrics |
| **Commercial provider (FaceTec, iProov, etc.)** | Provider-side (can be self-hosted for some) | 3D liveness + 1:N dedup + anti-spoofing, often with anti-injection | Strong (their core product) | Via their SDK / flow | Strong | Depends: FaceTec self-hosted can keep processing in your infra | Commercial, hardened | Solves the trust+ liveness problem; costs license/integration; may require account/keys |

### 4.2 What "local ML inference" actually means here

**CONFIRMED:** Browser-based inference via TensorFlow.js or ONNX Runtime Web can run face detection + face description/embedding extraction entirely on the user's device. The raw camera feed does not need to leave the browser for embedding extraction. The embedding is a numeric feature vector derived from the face region.

**UNVERIFIED / SPECULATIVE:**
- The *quality* and *robustness* of the embedding depends heavily on the model. face-api.js's descriptor is a lightweight ResNet-like model, not a state-of-the-art face recognition model. For a production personhood system, you would want a stronger recognition model (e.g., ArcFace-class) and an anti-spoofing model. Porting a strong recognition + anti-spoofing pipeline to the browser via ONNX Runtime Web + WebGPU is **feasible but non-trivial**, especially anti-spoofing, which is an active research area with no single bulletproof open-source browser model.
- "Embedding" is **not** a cryptographic key. It is a noisy, machine-learned feature vector. Two photos of the same person yield similar-but-not-identical embeddings. This is why you cannot treat an embedding like a secret key without a fuzzy extractor / secure sketch (see §6).

### 4.3 Best realistic option for Anonimus (self-built path)

**CONFIRMED / STRONG INFERENCE:**

- For a **hackathon MVP** that must be real (not mocked), the most realistic on-device option is a browser-based pipeline using **ONNX Runtime Web (WebGPU where available, WASM fallback)** with a **credible face recognition model** (e.g., an InsightFace-class ArcFace-style model converted to ONNX) for embedding extraction, plus **some liveness check** (see §5). face-api.js is simpler but weaker and aging; the vladmandic fork is better-maintained but still face-api.js-class.
- For a **production-strength** system, the strongest credible self-built path is still a **server-side or TEE-hosted verification service** using Strong recognition + liveness models, with the result signed and returned — because the hardest parts (reliable anti-spoofing, anti-injection, 1:N dedup at scale, model updates) are expensive to do well in-browser and are exactly what commercial providers specialize in.
- **Recommendation:** For the MVP, use on-device embedding extraction as the *local processing* step (to honor the privacy goal), but **do not rely on the client as the trust anchor**. The trust anchor is the attestation (§8, §12, §16). The embedding itself can stay local; what leaves the device is a commitment / credential / attestation, not raw biometrics.

---

## 5. Liveness / Anti-Spoofing

### 5.1 The core problem

A face embedding extracted from a single image or a naïve video frame does **not** prove a live person is present. It proves "there is something that looks like a face in this image." Attacks:

- **Photo replay:** a printed photo or a photo on a screen.
- **Video replay:** a recorded video of the target person.
- **Screen replay / virtual camera:** a video stream fed through a virtual camera.
- **Deepfake / synthetic face:** a generated or swapped face.
- **Camera injection:** software-level substitution of the camera stream (see below).

### 5.2 Realistic local approaches

| Approach | Security level | Attack surface | Realistic for MVP? |
|---|---|---|---|
| **Challenge-response (head turn, blink, mouth open, raise eyebrows, randomized gesture)** | Low-to-moderate. Raises the bar vs. a static photo, but a pre-recorded video of the person performing the challenge can still pass; deepfakes can synthesize the response; a virtual camera can play a prepared video. | Video replay, virtual camera, deepfake synthesis of the gesture, scripted automation. | Feasible as a basic check, but **not sufficient alone**. Easy to implement with MediaPipe landmarks (pose/landmarks) or a face tracker. |
| **Blink detection** | Low. Blink can be synthesized; a video of the person blinking can replay. Widely overstated as "proof of liveness." | Replay, synthesis, virtual camera. | Not sufficient; do not rely on it as the liveness anchor. |
| **Multi-frame temporal analysis** | Moderate. Analyzing a short video sequence for natural motion, specular reflections, micro-movement, texture cues. Better than single-frame. | High-quality video replay, sophisticated deepfakes, injection. | Feasible with a dedicated liveness model; open-source browser models for this are limited/immature. |
| **Passive liveness (single-frame or few-frame anti-spoofing model)** | Moderate-to-good if the model is strong and kept current. Detects presentation attacks (photo/screenshot/screen) via texture, moiré, depth cues, etc. | Advanced presentation attacks, deepfakes, injection below the model's view. | The strongest realistic local option, but strong open-source browser models are not plug-and-play; you would likely port an anti-spoofing model via ONNX. |
| **Depth estimation (single-camera depth cues, or structured light/ToF where available)** | Moderate where available; limited on standard webcams. | 2D replay still possible; 3D attacks harder. | Limited on typical user hardware. |
| **Camera integrity / injection detection** | Important and often overlooked. Detecting that the video stream is from a real camera and not a virtual/injected source. | Software injection, virtual cameras, compromised browser/OS. | Hard to do reliably in a browser; this is why commercial providers invest heavily here. |
| **Hardware-rooted attestation (TEE, secure enclave, device integrity APIs)** | Strong where it works, but **not general-purpose for a public web DApp**. | Limited to specific platforms/apps; does not cover a generic desktop browser user. | Not a general solution for Anonimus's web flow (see §13). |

### 5.3 The injection attack — the deeper problem

**STRONG INFERENCE / CONFIRMED from current security research:** The threat has moved from "show a photo to the camera" to "feed a synthetic stream into the camera pipeline." Injection attacks (virtual cameras, compromised browser/extension, compromised OS, hook-based stream substitution) can present a live-looking feed without a real person. This is why **liveness alone is not enough** — you need the whole pipeline to be trustworthy, which in a browser is hard to guarantee. Commercial providers (FaceTec, iProov, etc.) invest specifically in camera-pipeline + injection defenses and anti-spoofing tuned against current attacks.

**Implication for Anonimus:** A purely client-side browser liveness check raises the bar but does **not** establish a high-assurance "this is a real, live, unique human" claim. For a system whose value is Sybil-resistant personhood, that gap matters. This is the central reason a **trusted verification step** (provider or Anonimus-operated service with stronger controls) is the realistic anchor.

### 5.4 What is realistic for a hackathon MVP

**CONFIRMED / STRONG INFERENCE:**

- A **basic challenge-response + multi-frame check** using MediaPipe landmarks or a face tracker is feasible and better than nothing. It provides a modest anti-replay/anti-static-photo signal.
- A **passive liveness model** ported to ONNX Runtime Web would be a meaningful improvement but is more work and model-dependent.
- **None of these is sufficient alone** for a high-assurance personhood claim. They should be treated as **defense-in-depth** around a trusted verification step, not as the proof itself.

**Do not build the MVP around "blink twice and you're human."** That is explicitly called out in the brief as insufficiently skeptical.

---

## 6. The Unique-Human Problem

This is the crux. The brief frames it correctly:

> Midnight's nullifier mechanism can prevent repeated use of the SAME credential/secret within a scope. But it does NOT automatically prove that A and B belong to the same human.

### 6.1 What Midnight gives us

**CONFIRMED from compact-core + compact-structure references:**
- A **domain-separated nullifier** derived via `persistentHash(domain_prefix || sk)` is unique to a secret `sk`. If the same `sk` (same credential) is used twice in the same campaign scope, the spent `Set` rejects the second use. This is the standard anonymous-membership + nullifier pattern (Merkle tree membership + spent Set).
- This enforces **one credential per campaign**, not **one human across credentials**.

### 6.2 The gap

If a human can generate multiple independent credentials (multiple `sk`s, multiple commitments, multiple wallets), Midnight's nullifier mechanism does not link them. The human can appear as multiple distinct private-state holders and participate multiple times — exactly the attack Anonimus must prevent.

### 6.3 How to establish "one physical human → one persistent credential"

This is the **personhood/credential-issuance** problem, not the nullifier problem. Candidates:

| Approach | Feasibility today | Notes |
|---|---|---|
| **Fuzzy extractor / secure sketch from face template** | Theoretical; hard in practice for faces | Fuzzy extractors let you derive a stable key from noisy biometric data using public helper data. They are well-studied (Dodis et al.; surveys exist). For faces specifically, designing a fuzzy extractor with strong error tolerance and security is hard; the research literature notes limitations. **Not an off-the-shelf browser solution.** |
| **Biometric-derived key (raw embedding as key)** | No — embeddings are noisy and not secret-key material | Two captures differ; you cannot use the embedding directly as a cryptographic secret without a fuzzy extractor. |
| **Local biometric comparison + credential issuance** | Feasible as a process, not as a trustless protocol | A trusted verifier (provider or Anonimus service) establishes "this is a real, unique human" and issues a **credential/attestation** bound to a per-user secret. The user holds the secret in private state; Midnight proves possession. This is the zk-loan attestation pattern. **This is the realistic path.** |
| **Encrypted embedding + encrypted similarity (Uniquity v2 / FHE)** | Hard; depends on FHE performance and still needs a trust anchor for issuance | Compares encrypted embeddings server-side. It can detect duplicates, but it does not establish that the original issuance was trustworthy. Also depends on Zama fhEVM, which is not Midnight. |
| **ZK proof of biometric similarity** | Research-stage; not practical for high-dim embeddings in a hackathon | Proving "these two high-dimensional embeddings are similar" inside a ZK circuit with Compact is not realistically feasible for a hackathon — Compact is not designed for neural-network-style inference or high-dimensional cosine similarity. |
| **FHE over embeddings** | Heavy; off-chain for scale; not Midnight-native | Same issues as Uniquity v2. |
| **MPC / TEE for comparison** | Possible but adds infrastructure and trust assumptions | Could allow encrypted comparison without either party seeing raw biometrics, but still needs issuance trust and adds complexity. |
| **Device-bound credential (WebAuthn / platform authenticator)** | Real and available, but solves a different problem | WebAuthn/FIDO2 gives you a device-bound cryptographic credential and user verification (biometric/PIN on device). It establishes "this device + this user" but not "this is a unique human across devices." It is useful as a binding layer, not as personhood. |
| **External attestation (provider or Anonimus service)** | **Most realistic** | A real verifier establishes personhood + uniqueness and signs an attestation. The attestation (not raw biometrics) flows to Midnight. This is the zk-loan pattern and is the architecture we recommend. |

### 6.4 Recommended realization of "one human, one credential"

**STRONG INFERENCE / recommendation:**

The cleanest model that fits Anonimus's privacy goal and Midnight's capabilities:

1. **Personhood + uniqueness is established by a real verification step** (third-party provider, or Anonimus-operated verification service). This step may use on-device capture + liveness as inputs, but the **assertion of personhood is made by the verifier**, not by the client.
2. The verifier issues a **credential/attestation** bound to a per-user secret the user controls. Critically, the **raw biometrics do not need to be stored by Anonimus** — the verifier can do the comparison/issuing and return only the signed attestation (or a derived credential), consistent with the privacy goal.
3. The user holds a **per-user secret in local/private Midnight state** (like the zk-loan `UserSecretKey`). The credential/attestation is bound to that secret (or to a derived public key) and to the verification context.
4. Midnight proves, in ZK, that the user possesses a valid credential/attestation for the relevant context, without revealing the underlying biometric data or the secret.
5. Campaign/app-scoped uniqueness is enforced by domain-separated nullifiers over the credential/secret, so the same credential cannot be reused in the same scope.

This satisfies:
- **Privacy:** raw biometrics are not centralized in Anonimus.
- **Personhood:** asserted by a real verifier, not self-attested.
- **Uniqueness:** per-context, via nullifiers + credential issuance (one human → one credential per scope, enforced by the verifier at issuance).
- **Midnight fit:** uses Compact's native primitives (commitments, nullifiers, Merkle trees, private state, ZK proofs, selective disclosure), not FHE-on-chain.

---

## 7. Midnight Architecture

### 7.1 What Midnight is responsible for (and is good at)

**CONFIRMED from official docs + locally cloned references:**

1. **Private state on the user's device.** Midnight supports private state (e.g., via `midnight-js-level-private-state-provider` using LevelDB locally). The zk-loan tutorial stores credit data + attestation signature in private state; only the disclosed result lands on-chain. This is exactly the pattern for Anonimus: the user's secret and any sensitive inputs stay off-chain.
2. **Commitments + nullifiers + Merkle trees.** Compact provides `persistentCommit`, `persistentHash`, `HistoricMerkleTree`, `Set`, `Map`, and the standard anonymous-membership + spent-nullifier pattern. This is the core of Anonimus's uniqueness mechanism. The compact-core references are explicit about the correct usage (domain separation, disclosure rules, randomness from witnesses, leaf-guessing mitigation via commitments-as-leaves).
3. **ZK proofs with selective disclosure.** Compact circuits prove statements about private data and disclose only what is needed. This is the "verified human = true" result without exposing biometrics.
4. **Schnorr-in-circuit attestation verification.** The zk-loan tutorial demonstrates verifying a trusted provider's Schnorr signature inside the circuit, so the user cannot fabricate the credential data. This is the template for Anonimus's "trusted verifier → signed attestation → circuit verifies" flow.
5. **Transaction model + wallet integration.** The DApp Connector API (v4.0.1) lets a DApp connect to Lace (and other supported wallets), read state, prepare transactions, delegate proving, and submit. The wallet signs with the `midnight_signed_message:<size>:` prefix to prevent cross-DApp replay. This is the integration surface for both the Anonimus campaign frontend and external customer DApps.

### 7.2 What Midnight is NOT responsible for (and is not good at)

**CONFIRMED / STRONG INFERENCE:**

1. **Neural-network inference over embeddings.** Compact is not a general-purpose ML runtime. It is not suitable for computing face embeddings, cosine similarity over high-dimensional vectors, or anti-spoofing inference. Do not attempt to push biometric ML into Compact.
2. **High-dimensional similarity in ZK.** Proving "these two 128-d (or 256-bit quantized) embeddings are similar" inside a Compact circuit is not realistic for a hackathon and is not the intended use of Compact. The brief correctly flags this.
3. **Establishing personhood by itself.** Midnight can prove "the user possesses a valid attestation/credential" but cannot, on its own, establish that the underlying human is real and unique. That trust anchor is external.
4. **Replacing a face verification provider.** Midnight is the privacy + uniqueness + verification-result layer, not the biometric verification layer.

### 7.3 Where each piece belongs

**CONFIRMED / recommendation:**

| Piece | Where it belongs | Why |
|---|---|---|
| Camera capture + face detection + embedding extraction | User device (browser) | Privacy: raw biometrics stay local; feasible with browser ML. |
| Liveness / anti-spoofing (basic) | User device (browser) | Defense-in-depth; modest signal; keeps raw biometrics local. |
| Strong liveness / anti-spoofing / injection defense / 1:N dedup | Trusted verifier (provider or Anonimus service) | Hard to guarantee in-browser; this is the trust anchor. |
| Biometric comparison to establish one-human-one-credential | Trusted verifier (at issuance) | The trust anchor for "this human is real and unique." |
| Raw biometrics (selfies, video, embeddings, templates) | **Not stored centrally by Anonimus** | Privacy goal; only the verifier (if external) handles them, and only as needed. |
| Per-user secret (private state) | User's local Midnight private state | Like zk-loan `UserSecretKey`; user controls it; not public. |
| Credential / attestation (signed) | Issued by verifier; held/used by user in private state | Binding between personhood and the user's secret; signed by the trust anchor. |
| Commitment to credential / public key | Midnight private state or on-chain (if needed) | Privacy-preserving binding; domain-separated. |
| Campaign/app membership registry | Midnight: `HistoricMerkleTree` of credential public keys (or commitments-as-leaves) | Anonymity-preserving membership; leaf-guessing mitigated by commitments. |
| Uniqueness (spent) | Midnight: `Set` of domain-separated nullifiers | One credential per scope; deterministic rejection of duplicates. |
| Verification result (verified/uniqueness) | Disclosed from Compact circuit (selective disclosure) | Customer learns "verified + unique-in-scope = true/false," nothing else. |
| Signed verification result for callback | Anonimus backend signs the result (or the result is cryptographically bound) | Resists forgery, replay, cross-app/cross-session misuse; see §8, §12. |
| Campaign creation + metadata | Anonimus backend (application metadata) + Midnight (campaign-scoped state if needed) | Campaign management; eligibility export for reward distribution (MVP: eligibility only). |
| Wallet connection / transaction submission | Lace (or Gero/J**AM) via DApp Connector API | Real Midnight wallet integration; user signs with their wallet. |
| Customer DApp verification of callback result | Customer verifies signature / cryptographic binding | Customer does not need raw biometrics; verifies the proof of personhood + uniqueness. |

### 7.4 The zk-loan attestation pattern, applied to Anonimus

This is the single most important architectural reference. The pattern:

1. There is a **trusted attestation provider** with a Jubjub keypair, registered on-chain in the contract's `providers` map.
2. The user (CLI/wallet) sends data to the provider's `POST /attest` endpoint; the provider **signs** the data (including a user-identity binding, e.g., a user public key hash) with a Schnorr signature.
3. The signature is stored in the user's **private state** and submitted as part of the ZK witness.
4. The Compact circuit verifies the signature against the registered provider PK **inside the ZK proof**, so the user cannot substitute their own data.
5. Only the result (e.g., loan status) is disclosed on-chain; the underlying data stays private.

For Anonimus, the analogous flow:

1. A **personhood verifier** (third-party provider, or an Anonimus-operated verification service) is the trusted attester. It establishes "real human + uniqueness" and signs an attestation bound to the user's per-user secret (or derived public key) and to the verification context (campaign/app scope, session, redirect target, etc.).
2. The attestation is held in the user's private state.
3. A Compact circuit verifies the attestation (signature check against the registered verifier PK) and enforces campaign/app-scoped uniqueness (nullifier + membership), then discloses the verification result.
4. The customer DApp (or campaign frontend) receives a **cryptographically verifiable result**, not biometrics.

**This is the blueprint.** The zk-loan tutorial is official Midnight documentation and is the strongest evidence for how to wire an external verifier into a Compact contract.

### 7.5 Wallet integration — what is real

**CONFIRMED from DApp Connector spec + official docs:**

- **Lace** injects `window.midnight.mnLace` (an `InitialAPI`) into the page. The DApp calls `wallet.connect(networkId)` to get a `ConnectedAPI`, then uses methods like `getConfiguration()`, `getShieldedBalances()`, `getUnshieldedAddress()`, `signData()`, `balanceUnsealedTransaction()`, `submitTransaction()`, and `getProvingProvider()`.
- The DApp Connector API is versioned (v4.0.1 on mainnet/preprod) and stable-ish; the spec warns about malicious extension injection and recommends install-time freezes (`Object.defineProperty` with `writable: false, configurable: false`) and UUID-keyed API installation.
- **Gero** has a Midnight wallet; **J**AM (1AM)** is referenced alongside Lace in official docs as a supported/community wallet. The community-wallets reference exists in the docs; we could not fetch it live (rate-limited) but it is referenced in the docs tree.
- The wallet's `signData` prefixes data with `midnight_signed_message:<size>:` to bind the signature to Midnight and prevent accidental/cross-use signing.
- For proof generation, the wallet can delegate to a proving provider (`getProvingProvider`), or the DApp can use a proof server directly. The local devnet includes a proof server on :6300.

**Implication for Anonimus:** The user connects their Midnight wallet (Lace preferred; Gero/J**AM supported) to the Anonimus flow. The wallet is used for on-chain interaction (campaign participation, submitting the verification transaction, retrieving eligibility). The wallet address is **not** the personhood identity — the personhood identity is the per-user secret + credential/attestation. This keeps wallet ownership and personhood as separate concepts, as the brief requires.

---

## 8. Security Model

### 8.1 Threat model

Actors and what they can do:

| Actor | Knows / sees | Can verify | Must trust | Can lie about | If malicious |
|---|---|---|---|---|---|
| **User** | Their own biometrics, secret, wallet | Their own actions | The verifier's attestation; the client code they run | Anything they control (client output, private inputs) | Can modify the client, bypass liveness, submit fabricated data; the mitigation is the external attestation, not the client. |
| **User device / browser** | Everything the client code sees | Nothing independently | The client code as delivered | Can be tampered with (JS modification, extension, injected stream) | Can fake "verified = true" unless an external attestation binds the result. |
| **Anonimus backend** | Application metadata, campaign state, callback results, attestation references (not raw biometrics, by design) | Cryptographic results, signatures | The verifier's signatures; the Midnight state | Could mishandle data; design minimizes what it sees. | Could leak logs/metadata; not a biometric store by design. |
| **Personhood verifier** (provider or Anonimus service) | What it needs to verify (biometrics, liveness), depending on model | Whether the human is real + unique | Its own integrity + signing key | Could issue attestations to non-humans if compromised | The trust anchor; its key is registered on-chain; its attestations are what Midnight verifies. |
| **Midnight network** | Public ledger state; private state is not on-chain | Transaction validity, ZK proofs, nullifier uniqueness | Consensus; the contract's logic | Nothing (it enforces the contract) | N/A — it is the enforcement layer. |
| **Customer DApp** | The verification result + signature from Anonimus | The signature / cryptographic binding | Anonimus's signing key (or the contract's disclosed result) | Could misuse the result; cannot forge it | Cannot fabricate a valid result; can only act on what it receives. |
| **Wallet (Lace/Gero/J**AM) | User's keys, addresses, balances | Signs on behalf of the user | The user | Nothing (it signs what it is asked, with user approval) | Could be compromised; the `signData` prefix mitigates some cross-use; the user's approval is the gate. |

### 8.2 The critical question: can a malicious user modify the frontend and claim "I passed face verification"?

**CONFIRMED / answer: yes, unless mitigated.**

If the face verification result is produced entirely by client-side JavaScript and the only thing that leaves the device is "verified = true" (or an embedding the server will trust), then a malicious user can:

- Modify the JS to skip the camera and return a hardcoded "verified = true."
- Replace the embedding with a precomputed one.
- Run the flow headlessly / via automation.
- Bypass liveness by scripting a synthetic feed.

**This is why the trust anchor must be external.** The client can be the *capture* and *local processing* layer, but the *assertion of personhood* must come from something the user cannot unilaterally forge:

- **A trusted verifier's signature** (the zk-loan pattern): the verifier (provider or Anonimus service) signs an attestation after performing the real verification; the Compact circuit verifies the signature. The user cannot forge the verifier's signature.
- **A server-side verification pass**: the client sends capture data (or a challenge) to a server that performs the real face + liveness check and returns a signed result. This keeps the heavy/security-sensitive verification out of the user's control.
- **A hardware-rooted attestation** (TEE, platform authenticator, device integrity): only covers specific platforms/apps, not a general web DApp. Useful as defense-in-depth, not as the general anchor.

**For Anonimus, the right mitigation is the external attestation model**, because it:
- Keeps raw biometrics out of Anonimus's central systems (the verifier can be external, or Anonimus can operate a verification service that does not store biometrics long-term / at all — depending on design).
- Gives Midnight a cryptographic assertion it can verify, not a client self-report.
- Scales to the callback/redirect flow: the signed attestation (or a derivative signed result) is what the customer DApp verifies.

### 8.3 Replay, cross-app, cross-session, wrong redirect attacks

**CONFIRMED / recommendation:**

The verification callback/result must be resistant to:
- **Forged results:** mitigated by signing the result (or by the result being a disclosed contract output that is publicly verifiable). The customer verifies the signature / binding.
- **Replay:** bind the result to a session/nonce/redirect target/time. The callback should include a challenge/nonce from the customer and be bound to the intended redirect. The `signData` prefix pattern in Midnight (binds to DApp + network) is analogous; for the callback, include a session nonce and redirect target in the signed result.
- **Wrong redirect target:** bind the result to the intended callback URL / nonce; the customer verifies the binding.
- **Cross-application reuse:** scope the attestation/result to the specific application/campaign context (domain separation). An attestation for app A should not be valid for app B. This is the same domain-separation principle as Compact nullifiers, applied to the attestation/result.
- **Cross-session reuse:** bind to a session/nonce; one-time use.
- **Duplicate participation where uniqueness is required:** enforced by Midnight nullifiers + the credential model; the result should reflect uniqueness-in-scope.

**Implementation sketch for the callback result:**
- The customer DApp initiates a verification request with a **nonce + expected redirect + app/campaign scope**.
- The user completes PoH at Anonimus.
- Anonimus produces a result that includes: `app_scope`, `campaign_scope_or_null`, `session_nonce`, `verified: true/false`, `unique_in_scope: true/false`, and is **signed** by Anonimus's verification-key (or is a disclosed contract output verifiable on Midnight).
- The customer verifies the signature and the nonce/redirect/scope binding, then grants access.

This is not inventing security casually; it is the standard pattern for a verification + callback flow with a cryptographic result, adapted to the Midnight attestation model.

### 8.4 Weakest links (do not assume "decentralized + ZK = secure")

**CONFIRMED / critical:**

The weakest link is **the initial personhood verification**, because:
- If it is client-only, it is forgeable.
- If it is server-side but run by Anonimus without strong liveness/injection defenses, it is a weaker anchor than a hardened provider.
- If it is a third-party provider, you have vendor trust + dependency + potential cost/keys.

Everything downstream (Midnight uniqueness, ZK results, signatures) is as strong as the credential/attestation it verifies. A weak personhood anchor makes the whole system weak, regardless of how nice the Midnight layer is. **Be explicit about this.**

---

## 9. Privacy Model

### 9.1 Data flow (recommended architecture)

```
User device
  │
  ├─ Camera + face detection + (basic) liveness  ── local, raw biometrics stay here
  │
  ├─ (strong liveness / comparison done by verifier, if external)
  │
  ▼
Trusted personhood verifier  (third-party provider OR Anonimus verification service)
  │   ── establishes real-human + uniqueness
  │   ── issues signed attestation bound to user's per-user secret + scope
  │   ── raw biometrics handled here only as needed; not stored by Anonimus central systems
  │
  ▼
Signed attestation / credential  (does NOT contain raw biometrics)
  │
  ▼
User's local Midnight private state  (per-user secret + attestation)
  │
  ▼
Midnight Compact circuit
  │   ── verifies attestation signature (against registered verifier PK)
  │   ── enforces campaign/app-scoped uniqueness (nullifier + membership)
  │   ── discloses only: verified + unique-in-scope
  │
  ▼
Signed/cryptographic verification result  (for callback to customer DApp)
  │   ── bound to session nonce + redirect + scope
  │
  ▼
Customer DApp  (verifies result; learns verified/unique, not biometrics)
```

### 9.2 What leaves the device

**Recommendation (minimum data that leaves the device):**

- **A signed attestation / credential** from the verifier, bound to the user's per-user secret (or derived public key) and to the scope. This is **not** raw biometrics.
- Optionally, a **commitment** to the credential/public key if you want on-chain privacy for the identity (e.g., commitments-as-leaves in the Merkle tree to mitigate leaf-guessing). The compact-core reference explicitly recommends this.
- For the callback: a **signed result** (or a disclosed contract output) bound to the session/redirect/scope.

**Not recommended to leave the device:**
- Raw selfies, video, facial images.
- Raw facial embeddings or biometric templates (unless briefly needed by the verifier during the live verification, and even then minimized).
- The user's per-user secret (stays in local private state).

### 9.3 What is public / private / local / on-chain / temporary

| Data | Location | Visibility |
|---|---|---|
| Raw biometrics (selfie/video/embedding/template) | User device / verifier (transiently) | Not centralized in Anonimus; not on-chain; ideally not stored at all by Anonimus. |
| Per-user secret | User's local Midnight private state | Private to the user; not on-chain. |
| Credential / attestation (signed) | User's private state; verifier holds its own records as needed | Not public; not on-chain in raw form; the signature is verified in-circuit. |
| Commitment to credential/public key (if used) | On-chain (Merkle tree leaves) or private | If on-chain as a commitment, hides the underlying value; mitigates leaf-guessing. |
| Campaign/app membership registry | On-chain (`HistoricMerkleTree`) | Membership proofs are zero-knowledge (which member is hidden); insertion count is observable. |
| Nullifiers (spent) | On-chain (`Set`) | Public; reveals that *some* credential was used in a scope, not which human. |
| Verification result (disclosed) | On-chain (if contract-disclosed) or in callback | Customer sees verified/unique; not biometrics. |
| Callback signature / binding | In callback | Customer verifies; bound to nonce/redirect/scope. |
| Campaign metadata | Anonimus backend (application metadata) | Application-visible; not biometric. |
| Wallet address | On-chain / known to wallet / customer | Public; **not** the personhood identity (separate concept). |
| IP / browser / device metadata | Transiently at Anonimus backend / verifier / callback | Operational metadata; minimize retention; be aware of privacy considerations. |

### 9.4 Privacy threat model

**CONFIRMED / recommendation:**

Potential leaks to assess:
- **Wallet address:** public; can be linked to participation if the transaction is observable. Mitigation: personhood identity is separate from wallet; the on-chain nullifier/commitment does not reveal the wallet directly (it reveals a credential-derived value). Still, a wallet address used in a transaction is visible.
- **Timing / participation pattern:** observable on-chain (when a nullifier is inserted, when a campaign interaction happens). Mitigation: accept that some timing metadata is inherent; minimize what else is linkable.
- **Commitment / nullifier:** on-chain; reveals that *a* credential was used in a scope, and that a particular nullifier was spent (linking repeated uses of the *same* credential in the same scope, which is the intended uniqueness signal). Does not reveal the human.
- **Biometric commitment:** if you commit to a biometric-derived value, ensure it is a commitment with randomness (not a raw hash), to avoid leaf-guessing / brute-force. The compact-core reference is explicit.
- **Verification session / callback URL:** operational; bind to nonce/redirect; minimize retention.
- **IP / browser / device metadata:** operational; minimize retention; be aware of linkability across sessions.
- **Provider attestation:** if external, the provider sees what it needs to verify; Anonimus should not additionally collect. If Anonimus operates the verifier, design it to minimize storage.
- **Cross-application usage:** scoped by domain separation; an attestation/result for one app should not be reusable for another. Clear scoping in the attestation/result.

**Goal:** the customer learns "verified + unique-in-scope," the Midnight network learns the public uniqueness state (nullifiers/membership), and **no party centrally holds raw biometrics** (except transiently at the verifier, if external). This matches the brief's privacy goal.

---

## 10. Third-Party vs Self-Built

### 10.1 Option A — Third-party personhood provider

**Examples:** FaceTec (self-hostable in some models), iProov, Civic (with FaceTec), World ID (orb-based, different model), BrightID (social, different model), or a smaller/specialist provider.

**Analysis:**

| Dimension | Assessment |
|---|---|
| **Privacy** | Depends on the provider. FaceTec self-hosted can keep processing in your infra (good fit for the privacy goal). Others may process on their infra (different trust model). The key: what data leaves the user, where it is processed, and whether Anonimus ever sees raw biometrics. |
| **Trust** | You trust the provider's verification + liveness + anti-spoofing. The provider becomes the trust anchor; its signatures/attestations are what Midnight verifies. |
| **Implementation difficulty** | Lower for the biometric side (the provider handles face+liveness+dedup); you integrate via their API/SDK and wire the result into Midnight. Higher for the integration + accountability (keys, attestation format, scope binding). |
| **Security** | Generally higher for the personhood anchor (hardened providers invest in anti-spoofing, injection defense, 1:N dedup, model updates). This is their core business. |
| **Cost** | Often a license / per-verification cost; may require account/keys. FaceTec self-hosted has its own cost model (license, hosting). |
| **User experience** | Provider SDKs typically provide a guided capture flow; UX varies. |
| **Hackathon feasibility** | Depends on getting the account/keys/config. If a provider requires an API key/account/setup that only you can do, that is a user-intervention point (per the brief's rule). |
| **Vendor lock-in** | Real: your personhood anchor becomes tied to the provider's API/format/keys. Mitigate by abstracting the attestation interface so the verifier is swappable (the contract registers verifier PKs; the attestation format is a defined interface). |

**Best-fit candidate (self-hosted, privacy-aligned):** FaceTec self-hosted is the leading candidate for a real, hardened, privacy-aligned option, because it can run in your own infra (biometrics stay in your control, not a third party's cloud), provides 3D liveness + 1:N dedup, and is designed for exactly this kind of personhood use. **STRONG INFERENCE:** it is the most credible "real provider" option that aligns with the privacy goal. It may still require a developer-portal license key / account / setup that only you can do — a user-intervention point when we reach it.

### 10.2 Option B — Anonimus-owned on-device verification

**Analysis:**

| Dimension | Assessment |
|---|---|
| **Privacy** | Best on paper (nothing leaves the device except what you choose). Realistic only if the trust anchor problem is solved. |
| **Security** | Weaker than a hardened provider for the personhood anchor, because the browser client is not a trustworthy verification environment. You would need to add server-side verification or strong attestation to close the gap — at which point you have partially rebuilt Option A. |
| **Sybil resistance** | Depends on the uniqueness/credential-issuance model. On-device embedding alone does not give you one-human-one-credential without a trusted issuance step. |
| **Liveness** | Hard to do well in-browser; the strongest local options are partial. |
| **Client compromise** | The fatal issue: the user controls the browser; a self-built client-side-only flow is forgeable. |
| **Implementation difficulty** | Higher overall, because you must solve the trust anchor, liveness, anti-spoofing, anti-injection, and 1:N dedup yourself — all hard — or build a server-side verifier (which is then "Anonimus-owned provider," a hybrid). |
| **Hackathon feasibility** | Lower for a *secure* personhood claim; you can build a demo that extracts embeddings in-browser, but a secure personhood anchor is a lot to build from scratch in a hackathon. |

### 10.3 Recommendation

**STRONG INFERENCE / recommendation:**

Build a **hybrid**:
- Use **on-device capture + local processing** (embedding extraction, basic liveness) to honor the privacy goal and to keep raw biometrics local.
- For the **trust anchor**, start with an **external/real verification step** — either a third-party provider (FaceTec self-hosted is the leading candidate) **or** an Anonimus-operated verification service that performs real face + liveness verification server-side and issues a signed attestation.
- Do **not** pretend the client is the trust anchor. The client is the capture/processing layer; the verifier is the anchor.
- Abstract the verifier interface so the contract registers verifier public keys and the attestation format is defined — this keeps the architecture clean and swappable, and avoids hard vendor lock-in.

For the **hackathon MVP**, if a real provider account/keys are not available yet, the smallest *real* vertical slice is:
- The Midnight side: a Compact contract that registers a verifier PK, verifies a signed attestation in-circuit, enforces campaign-scoped uniqueness via nullifiers + membership, and discloses the result. This is real and testable on the local devnet, using the zk-loan attestation pattern (with an ephemeral verifier key for testing — not a fake "verified = true").
- A client/backend that produces a **real signed attestation** from a verifier key (even if the face verification behind it is initially a placeholder process you will replace with a real provider or service later). The critical point: the attestation is a **real signature from a registered key**, and the circuit **really verifies it** — not a mocked "verified = true."

Do **not** build a fake face verification or fake proofs. Build the real Midnight + attestation machinery first; plug in the real face verifier when the provider/service is ready. This is consistent with the brief's "no mocks" rule and "build a real core first" directive.

---

## 11. Recommended Architecture

```
                    USER
                      │
                      ▼
                ┌─────────────┐
                │  Camera     │   local capture — raw biometrics stay here
                │  + face     │
                │  detection  │
                │  + basic    │
                │  liveness   │
                └──────┬──────┘
                       │  (optional) stronger liveness / comparison done by verifier
                       ▼
          ┌─────────────────────────────┐
          │  PERSONHOOD VERIFIER        │   third-party provider (e.g. FaceTec self-hosted)
          │  (or Anonimus verification  │   ── OR ──
          │   service, server-side)     │   Anonimus-operated real face+liveness verification
          │                             │   that issues a signed attestation
          │  − establishes real human   │
          │  − establishes uniqueness   │
          │  − signs attestation bound │
          │    to user secret + scope   │
          │  − raw biometrics handled  │
          │    here only as needed;    │
          │    NOT stored by Anonimus  │
          └────────────┬────────────────┘
                       │  signed attestation / credential (NO raw biometrics)
                       ▼
          ┌─────────────────────────────┐
          │  USER LOCAL MIDNIGHT STATE  │   per-user secret (private state) +
          │  (private state, device)    │   attestation, held by user
          └────────────┬────────────────┘
                       │
                       ▼
          ┌─────────────────────────────┐
          │  ANONIMUS BACKEND           │   application metadata, campaign mgmt,
          │  (thin)                     │   callback signing, eligibility export;
          │                             │   NOT a biometric store
          └────────────┬────────────────┘
                       │
          ┌────────────┴─────────────┐
          │                          │
          ▼                          ▼
   ┌─────────────────┐      ┌──────────────────────┐
   │  MIDNIGHT       │      │  CUSTOMER DApp       │
   │  Compact contract│     │  (or campaign         │
   │  − verifies     │     │   frontend)           │
   │    attestation  │     │  − verifies callback  │
   │  − uniqueness   │     │    result signature   │
   │    (nullifier +│     │  − checks scope/      │
   │     membership) │     │    nonce/redirect     │
   │  − discloses    │     │  − grants access      │
   │    result       │     │                       │
   └─────────────────┘      └──────────────────────┘
```

**Modification from the brief's sketch:** the "Local verification → Cryptographic artifact" step is split: local capture/processing stays on the device; the **trustworthy assertion** comes from the verifier (signed attestation). The cryptographic artifact that flows to Anonimus/Midnight is the attestation/credential, not raw biometrics. The customer DApp verifies a signed result bound to its session/scope, not the user's biometrics.

---

## 12. Minimum Viable Architecture

### Components

1. **Compact contract (Midnight)** — the core:
   - Registers personhood verifier PK(s) on-chain (`providers` map, like zk-loan).
   - Per-user secret in private state; derived public key via domain-separated `persistentHash`.
   - Campaign/app membership registry: `HistoricMerkleTree` of credential public keys (or commitments-as-leaves to mitigate leaf-guessing).
   - Uniqueness: domain-separated nullifiers + spent `Set`, scoped per campaign/app.
   - Verification circuit: verifies the verifier's signature on the attestation (Schnorr-on-Jubjub, like zk-loan; or a wrapper once `jubjubSchnorrVerify` ships in the standard library), enforces membership + nullifier uniqueness, discloses `verified` + `unique_in_scope`.
   - Campaign-scoped state: campaign identifier, scope binding, eligibility tracking for export (eligibility only, no reward distribution in MVP).
2. **Attestation interface** — defined format for the verifier's signed attestation, bound to:
   - User's per-user secret / derived public key.
   - Scope (campaign ID and/or app identifier).
   - Session nonce + redirect target (for callback).
   - Timestamp / expiry.
   - Result (verified / unique-in-scope).
3. **Anonimus backend (thin)**:
   - Campaign creation / management (application metadata).
   - Verification session + callback handling (nonce, redirect, scope binding).
   - Signs the verification result for the callback (or the result is a disclosed contract output verifiable on Midnight).
   - Eligibility export for the project (wallet addresses / participant list the project is entitled to reward) — MVP: eligibility only.
   - Does **not** store raw biometrics.
4. **Client-side (browser)**:
   - Wallet connection via DApp Connector API (Lace preferred; Gero/J**AM supported).
   - Camera + face detection + (basic) liveness for capture/processing (privacy-preserving local step).
   - Interaction with the Compact contract via the Midnight SDK + proof server.
   - Callback/redirect flow for external customer DApps.
5. **Personhood verifier**:
   - Either a third-party provider (FaceTec self-hosted leading candidate) integrated via its API/SDK, **or** an Anonimus-operated verification service that performs real face + liveness verification and issues a signed attestation.
   - Registered on-chain as a verifier PK.
6. ** wallets**: Lace (primary), Gero and J**AM (supported/community). The DApp Connector API is the integration surface.
7. **Local devnet**: node :9944, indexer :8088, proof-server :6300, network `undeployed` — already up and verified.

### Cryptographic primitives

- `persistentHash` with domain-separated prefixes (identity derivation, nullifiers, scope binding).
- `persistentCommit` with per-user randomness (if using commitments-as-leaves / hiding identity).
- `HistoricMerkleTree` for membership (anonymous membership proofs).
- `Set` for spent nullifiers (uniqueness).
- Schnorr-on-Jubjub signature verification in-circuit (attestation verification) — following the zk-loan pattern; replacement by `jubjubSchnorrVerify` when it ships.
- Selective disclosure via `disclose()` — only the result leaves the circuit.
- Signature on the callback result (Anonimus verification key) bound to nonce/redirect/scope.
- Wallet signing via DApp Connector `signData` (with the `midnight_signed_message:` prefix) for on-chain interaction.

### External dependencies

- **Personhood verifier** (third-party provider or Anonimus-operated service). If third-party, likely needs an account/keys/config — a user-intervention point when reached.
- **Midnight local devnet** (up) for development; PreProd later.
- **Proof server** (:6300) for ZK proof generation (local devnet includes it).
- **Wallets**: Lace (user must have it installed); Gero/J**AM optional.
- **Optional**: FaceTec self-hosted (if chosen as provider) — needs license/account/setup; user-intervention point.

---

## 13. What We Should Build First

**Implementation order (real, incremental, no mocks):**

1. **Phase 1 — Smallest real Midnight primitive (the credential + uniqueness skeleton):**
   - A Compact contract that:
     - Registers a verifier PK on-chain (`providers` map).
     - Has a per-user secret witness + derived public key via domain-separated `persistentHash`.
     - Maintains a `HistoricMerkleTree` of credential public keys (or commitments-as-leaves).
     - Maintains a spent `Set` of domain-separated nullifiers.
     - Has a verification circuit that: verifies a signed attestation from the registered verifier (Schnorr-on-Jubjub, zk-loan pattern), checks membership, checks + inserts the nullifier, and discloses `verified` + `unique_in_scope`.
   - This is the zk-loan attestation pattern + the compact-core anonymous-membership + nullifier pattern combined. Real, compilable, testable on the local devnet. Use an ephemeral verifier key for testing (real signature, real verification in-circuit) — not a fake "verified = true."
   - **This proves the core machinery before any face provider is involved.**

2. **Phase 2 — Backend service layer:**
   - Campaign creation + campaign identifier + scope binding.
   - Verification session + callback (nonce, redirect, scope).
   - Callback result signing (Anonimus verification key) bound to session/redirect/scope.
   - Eligibility export for the project (MVP: eligibility only).
   - Wire the Compact contract from Phase 1 into this layer.

3. **Phase 3 — Campaign infrastructure:**
   - Campaign-scoped participation/uniqueness (already partly in Phase 1 via nullifiers scoped to campaign).
   - Eligibility retrieval for the project.

4. **Phase 4 — External integration flow:**
   - Customer DApp → Anonimus → PoH (real verifier) → signed result → redirect back → customer verifies.
   - Secure callback result (signature + nonce + redirect + scope binding; replay/cross-app/cross-session resistance).

5. **Phase 5 — Developer-facing integration surface:**
   - Minimal API/SDK surface for a customer DApp to request verification and verify the result, without knowing Midnight internals.
   - Wallet connection guidance (Lace DApp Connector).

6. **Personhood verifier integration** — plug in the real verifier (third-party provider or Anonimus-operated service) once it is ready. Until then, the attestation is a real signature from a registered key (tested with an ephemeral key), and the face verification behind it is the component you will replace with a real provider/service. **No fake face verification; no fake proofs.**

---

## 14. What We Should NOT Build

**Explicitly defer or avoid:**

1. **Fake/mock face verification, fake proofs, fake Midnight transactions, hardcoded verified users, simulated biometric results.** Not allowed by the brief; not built.
2. **FHE-on-chain biometric storage** (Uniquity's approach). Not Midnight-native; do not copy it. Use Compact's native primitives instead.
3. **Biometric comparison inside Compact.** Not feasible; not built.
4. **A centralized biometric database.** Not needed by design; not built. The verifier (if external) handles biometrics; Anonimus central systems do not store raw biometrics.
5. **Private reward distribution.** Out of MVP scope; the project distributes rewards. Not built now.
6. **Multiple personhood providers** (initially). Start with one verifier interface; abstract it. Not now.
7. **Cross-campaign anonymity guarantees** beyond per-campaign uniqueness. Not now.
8. **Production cloud deployment / Vercel optimization.** Local first. Not now.
9. **Elaborate frontend.** Minimal dev/test interface only. Not now.
10. **"Blink twice and you're human" as the liveness anchor.** Insufficient; do not rely on it.
11. **Trusting the browser client as the personhood anchor.** Not secure; mitigated by the external attestation model.

---

## 15. Remaining Unknowns

Questions that require further investigation before finalizing the design:

1. **Which personhood verifier to use, concretely.** FaceTec self-hosted is the leading candidate, but we need to confirm its current self-hosting model, licensing, liveness/anti-spoofing capabilities, and what account/keys/setup it requires. Other providers (iProov, Civic, etc.) and any newer ZK-friendly options should be compared. This is a user-intervention point when we reach it (license key / account / setup).
2. **Whether Anonimus should operate its own verification service** (server-side face + liveness + signed attestation) rather than integrate a third party, and what security level that service could realistically achieve. This affects the trust model and the privacy model (who sees the biometrics during verification).
3. **Whether a fuzzy-extractor-based "one human, one credential" can be made sound for faces in-browser.** Probably not for a hackathon; worth a focused literature check before ruling it out entirely. Current assessment: not an off-the-shelf solution.
4. **The exact Zama fhEVM performance characteristics** if we were to consider any encrypted-comparison idea — but we are not pursuing FHE-on-chain for Anonimus; this is only relevant if the design changes. Current assessment: not the path.
5. **The current Lace/Gero/J**AM DApp Connector details and any quirks** for the specific flow (wallet connection, proving delegation, transaction submission). The DApp Connector spec is stable; the fine details can be confirmed from the locally cloned docs + the wallet dev guide when docs.midnight.network is reachable again.
6. **Whether any temporary storage of biometric data is required by the chosen verifier** (some providers may need brief storage for deduplication/processing). If so, minimize and document; do not centralize in Anonimus.
7. **The callback/result signature scheme details** — which key Anonimus uses to sign results, how results are verified by customer DApps, key rotation, etc. Design is clear in principle; finalize when implementing.
8. **How campaign eligibility export works concretely** (what the project retrieves, in what form) — MVP: eligibility only; finalize when implementing.
9. **Kapa MCP access** — still blocked server-side (social login `server_error` at kapa.ai, confirmed via raw HTTP). This blocks the *preferred* research path but not the work, because the official docs are cloned locally and the zk-loan tutorial + compact references are available. When Kapa recovers, it becomes a valuable research tool for Midnight-specific questions.

---

## 16. Final Technical Verdict

**Should we proceed with building our own on-device PoH layer for Anonimus?**

**YES — but with a precise architecture, and with the on-device piece correctly scoped.**

Build Anonimus as a **hybrid privacy-preserving personhood + uniqueness service**:
- **On-device capture + local processing** (face detection, embedding extraction, basic liveness) stays on the user's device and keeps raw biometrics local — this honors the privacy goal and is feasible with browser ML (ONNX Runtime Web + a credible recognition model is the strongest realistic in-browser option; face-api.js/vladmandic is simpler but weaker).
- **The personhood + uniqueness trust anchor is a real verifier** — either a third-party provider (FaceTec self-hosted is the leading candidate, if its self-hosting + licensing works for us) **or** an Anonimus-operated verification service that performs real face + liveness verification server-side and issues a signed attestation. Do **not** rely on the browser client as the anchor; it is forgeable.
- **Midnight carries the privacy + uniqueness + verification-result machinery**, using its native primitives: per-user secret in private state, domain-separated `persistentHash` for identity/nullifiers/scope, `HistoricMerkleTree` for anonymous membership, `Set` for spent nullifiers, Schnorr-in-circuit attestation verification (the zk-loan pattern), and selective disclosure of the result. This is real, compilable, testable on the local devnet now.
- **The customer DApp learns "verified + unique-in-scope" via a cryptographically verifiable result** (signed and bound to session/redirect/scope), not biometrics.

**What we should NOT claim:**
- That the on-device face layer alone is a secure personhood proof. It is not.
- That Midnight can verify biometric similarity directly. It cannot (not practically, not for this).
- That we can avoid a trusted verification step entirely. We cannot — that is the fatal flaw in a purely client-side, no-provider design.

**What we SHOULD claim:**
- That we can build a real, privacy-preserving PoH + Uniqueness service where raw biometrics are not centralized in Anonimus, the personhood anchor is a real verifier (external or Anonimus-operated), and Midnight enforces per-context uniqueness and produces cryptographic verification results for customer DApps.
- That the zk-loan attestation pattern + compact-core anonymity patterns give us a confirmed, official, implementable blueprint for the Midnight side.
- That the local devnet + Compact toolchain are working now and can be used immediately for Phase 1.

**Immediate next concrete engineering action:** Begin Phase 1 — write the smallest real Compact contract (verifier registration + per-user secret + derived public key + Merkle tree membership + nullifier uniqueness + in-circuit attestation verification + disclosed result), compile it with the working toolchain, and test it on the local devnet using an ephemeral verifier key and a real signature (zk-loan pattern). No face provider needed yet; no mocks. The face verifier is the component to plug in later.

---

### Source notes

- **Uniquity:** public README + docs at github.com/Femtech-web/Uniquity (read via web). The live source repo is private; implementation details beyond the README are UNVERIFIED. Treat the README as the design intent, not an audited implementation.
- **face-api.js / vladmandic/face-api:** official repos + docs (model sizes, detectors, descriptor). face-api.js original is aging/unmaintained; vladmandic fork is better-maintained but still TF.js face-api-class; neither provides liveness.
- **MediaPipe:** official; good for landmarks/geometry; not a face-recognition/embedding solution by itself.
- **ONNX Runtime Web:** official (Microsoft); WebGPU + WASM; the best current path for stronger in-browser models.
- **CompreFace / DeepFace / InsightFace / LocalAI:** official repos/docs; strong but server-side — not our preferred architecture for the biometric layer (centralizes biometrics), though useful as reference for model quality.
- **FHE performance:** public reporting (Duality, Zama) — FHE operations are roughly 10× slower than plaintext; off-chain FHE for scale is the realistic model; on-chain FHE per-candidate at scale is impractical. This informs why Uniquity v2 leans on off-chain FHE and why Anonimus should not chase FHE-on-chain.
- **Fuzzy extractors / secure sketches:** Dodis et al. (foundational); surveys exist; face-specific fuzzy extractors are hard and not off-the-shelf. STRONG INFERENCE, not a confirmed deployable solution.
- **Liveness / anti-spoofing / injection:** current security research (biometricupdate, LexisNexis, ROC, Finextra, iProov analyst reports) — the threat has moved to injection + deepfakes; liveness alone is insufficient; camera-pipeline integrity matters.
- **Play Integrity / WebAuthn / TEE attestation:** official references — strong where applicable, but not a general solution for a public web DApp.
- **Midnight:** locally cloned official docs (midnightntwrk/midnight-docs); compact-core + core-concepts references from midnightntwrk/midnight-expert (cloned); zk-loan tutorial (official); DApp Connector API spec (official). Kapa MCP is the preferred research tool but is currently blocked server-side (confirmed); official docs are available locally.
- **Wallet integration:** DApp Connector spec + official docs + blog posts (Lace injects `window.midnight.mnLace`; Gero and J**AM referenced as supported/community wallets).

**Confidence levels:**
- Uniquity design intent: STRONG INFERENCE (from README/description; implementation UNVERIFIED).
- face-api.js capabilities: CONFIRMED (official docs).
- Liveness/anti-spoofing limitations: STRONG INFERENCE (from current security research; not a single authoritative source).
- Fuzzy extractor feasibility for faces: STRONG INFERENCE (from literature; not an off-the-shelf solution).
- Midnight primitives + patterns: CONFIRMED (official docs + references).
- zk-loan attestation pattern: CONFIRMED (official tutorial).
- DApp Connector + wallet integration: CONFIRMED (official spec + docs).
- Toolchain + devnet: CONFIRMED (locally verified this session).
- Kapa MCP availability: CONFIRMED blocked server-side (confirmed via raw HTTP this session).
