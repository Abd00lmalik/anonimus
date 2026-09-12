# FaceTec Feasibility Report for Anonimus

## Executive conclusion

**CONDITIONAL GO** — FaceTec is technically excellent and architecturally aligned with Anonimus's privacy goals, but has a critical licensing constraint that makes it unsuitable for a zero-budget hackathon demo in production mode. The free developer account sends user biometric data to FaceTec's cloud (development mode). Production self-hosting requires a commercial agreement with monthly minimums. However, FaceTec can be used in development mode for hackathon demos, with full self-hosting as a post-hackathon upgrade path.

---

## 1. FaceTec architecture

FaceTec is **software, not a service**. Two deployment modes exist:

### Testing API (Development)
```
User Browser → FaceTec Browser SDK (~3.7MB WASM)
  → 3D FaceScan captured (video selfie, ~430-515KB)
  → Encrypted (RSA + AES-256)
  → Sent to api.facetec.com (FaceTec's Testing Cloud on AWS)
  → FaceTec processes liveness + returns result
  → [FaceTec stores face images for "software improvement"]
```

### Self-Hosted Server (Production)
```
User Browser → FaceTec Browser SDK (~3.7MB WASM)
  → 3D FaceScan captured (video selfie, ~430-515KB)
  → Encrypted (RSA + AES-256)
  → Sent to YOUR server (FaceTec Server Docker container)
  → YOUR FaceTec Server processes liveness
  → YOU store/delete as you choose
  → [FaceTec receives NOTHING]
```

### Key components:
- **Browser SDK**: ~3.7MB WASM, runs in browser, captures 3D FaceScan
- **FaceTec Server**: Java JAR in Docker, runs on Linux (your infrastructure)
- **Database**: MongoDB/PostgreSQL (your infrastructure, stores FaceMaps)
- **Dashboard**: Node.js app (optional, for monitoring)

**Sources**: dev.facetec.com/configuration-options, dev.facetec.com/server-sdk-overview

---

## 2. Exact biometric data flow

### Development mode (Testing API):
1. Camera captures video frames (2-3 seconds)
2. Browser SDK creates 3D FaceMap (~80-300KB, encrypted)
3. 3D FaceScan (~430-515KB) transmitted to api.facetec.com
4. FaceTec cloud processes liveness check
5. Result returned to browser
6. **FaceTec retains face image data for software improvement**
7. **FaceTec collects**: OS version, SDK version, device ID, phone model, face images

### Production mode (Self-Hosted):
1. Camera captures video frames (2-3 seconds)
2. Browser SDK creates 3D FaceMap (~80-300KB, encrypted)
3. 3D FaceScan (~430-515KB) transmitted to YOUR server
4. YOUR FaceTec Server processes liveness check
5. Result returned to browser
6. **FaceTec receives NOTHING**
7. **YOU control all data storage and deletion**

**Critical distinction**: The advertising claim "NO End User Biometric Data or PII is sent to FaceTec" is **only true in production mode with a self-hosted server**. In development mode with a Testing API key, face images ARE sent to FaceTec.

**Sources**: dev.facetec.com/privacy-sdk, dev.facetec.com/terms (section 43-44), dev.facetec.com/configuration-options

---

## 3. Privacy analysis

### A. FaceTec receiving biometric information
- **Development mode**: YES. FaceTec receives face images, device info, OS info, usage metrics.
- **Production mode**: NO. Data stays on your server.

### B. Anonimus backend receiving biometric information
- **With FaceTec**: The 3D FaceScan (~430-515KB encrypted) passes through your backend to the FaceTec Server. Your backend can process and discard it immediately.
- **With FaceTec FaceVector**: You can extract a privacy-preserving FaceVector (no image data) for 1:1 matching if needed.

### C. Anonimus storing biometric information
- **NOT REQUIRED**. After FaceTec returns a liveness result, all biometric artifacts can be immediately deleted.
- The only thing needed is the boolean result: "liveness passed/failed"
- No FaceMap, no FaceVector, no images need to be stored.

### D. FaceTec usage/telemetry
- Development keys: telemetry sent to FaceTec (device info, usage stats, face images)
- Production keys: anonymous usage logs only (for billing verification)

### E. Browser-side data
- 3D FaceMap exists in browser memory during session
- Encrypted before transmission
- Can be discarded after transmission

### F. Server-side FaceMaps
- FaceTec Server stores them by default (for Dashboard and re-verification)
- **Can be configured to NOT store** — the "Recompiled Configuration" option lets your code control storage
- Storage is optional and configurable

### G. Logs
- FaceTec Server generates usage logs
- Recommended to write to non-ephemeral filesystem
- Logs contain session metadata, NOT biometric data

### H. Third-party data sharing
- FaceTec does NOT share user data with third parties (per privacy policy)
- With production keys, no biometric data leaves your infrastructure

### I. Persistent biometric database
- **NOT INHERENTLY REQUIRED** for Anonimus's use case
- FaceTec Server stores FaceMaps by default, but this is configurable
- Anonimus only needs: liveness result → attestation → Midnight enrollment
- After enrollment, all biometric artifacts can be deleted

**Privacy claim we CAN honestly make**:
> "Anonimus uses FaceTec software running on our own server. User biometric data never leaves our infrastructure. We do not store biometric data after verification. FaceTec does not receive, process, or retain any user biometric information."

---

## 4. License and developer-key analysis

### Developer account:
- **Free to create** at dev.facetec.com
- Provides: Device SDKs, Testing API access, encryption keys
- License: royalty-free, non-exclusive, non-sublicensable
- Purpose: "solely to develop applications"

### Development key behavior:
- FaceTec collects: face images, device info, OS info, usage metrics
- FaceTec may use face images to "understand the wide variety of face structures"
- This is **explicitly stated** in the privacy policy and terms

### Production key requirements:
- Must deploy FaceTec Server on your infrastructure
- Must send daily usage logs to FaceTec (for billing)
- Keys initially expire in 30-90 days (to verify log sharing)
- After verification, longer-term keys issued
- **Monthly minimum commitment required** (pricing not public — "Get a Quote")

### License key safety:
- The key itself does NOT contain or expose biometric data
- The key authenticates your SDK to FaceTec's servers
- In development mode: key enables data collection to FaceTec's cloud
- In production mode: key enables usage log reporting only
- **The key is safe to put in browser code** (it's an API key, not a secret)
- Server-side keys (private FaceMap encryption key) must stay server-side

### Key risks:
- Leaking a development key: FaceTec can track usage from your app
- Leaking a production key: FaceTec can track usage + verify logs
- Neither leak exposes USER biometric data (that's handled by the SDK encryption)
- **License does NOT cause FaceTec to receive biometric data in production mode**

**UNKNOWN**: Exact monthly minimum pricing. FaceTec says "minimum monthly commitment required" but does not publish specific numbers. Must request a quote.

**Sources**: dev.facetec.com/terms (sections 18-20, 43-45), dev.facetec.com/privacy-sdk

---

## 5. Zero-budget feasibility

### What's free:
- Developer account: FREE
- Developer SDKs: FREE
- Testing API access: FREE (50 requests/minute, 100 devices)
- FaceTec Server Docker image: included with SDK download
- Local development: FREE (Docker on your laptop)

### What costs money:
- **Production usage**: Monthly minimum commitment (unknown amount)
- **Production keys**: Only issued after deploying server + sending usage logs
- **Production server**: You must host it (your infrastructure costs)

### Can you develop for free?
**YES**. You can:
1. Create a free developer account
2. Download the Browser SDK
3. Use the Testing API for development
4. Run the FaceTec Server locally in Docker for testing
5. Build and test the entire integration

### Can you demo for free at a hackathon?
**YES**. Development mode works for demos. The Testing API is free and unlimited for development.

### Can you go to production for free?
**NO**. Production requires a commercial agreement with monthly minimums.

### Can you use localhost?
**YES**. The Browser SDK can point to `http://localhost:8080` for local FaceTec Server.

### Can you use a tunnel for mobile testing?
**YES**. The docs mention using tunnels for testing mobile devices against a local server.

**UNKNOWN**: Whether FaceTec offers special hackathon/non-commercial pricing. Their standard model requires monthly minimums for production.

---

## 6. Laptop/local-development feasibility

### Hardware requirements for FaceTec Server:
- Docker running on Linux (or Docker Desktop on Windows/Mac)
- The server is a Java JAR — moderate resource usage
- Recommended: 8+ cores for production throughput
- For development: any machine that runs Docker is fine

### Can it run on a developer laptop?
**YES for development**. FaceTec explicitly states:
- "FaceTec Server can be easily hosted locally on your development machine"
- Docker is the recommended approach
- Windows/Mac via Docker: "should only be used in early development"
- Localhost development is documented and supported

### Browser SDK requirements:
- Any modern browser with webcam
- 0.3MP minimum camera (VGA — any webcam works)
- No GPU required
- No specific CPU requirements in browser

### Development workflow:
1. Start FaceTec Server in Docker on localhost:8080
2. Point Browser SDK at localhost:8080
3. Run your web app on localhost:3001
4. Test face verification end-to-end
5. All processing stays on your machine during development

**Source**: dev.facetec.com/server-sdk-overview, dev.facetec.com/technical-specs

---

## 7. Minimum Anonimus architecture

```
User Browser
  → FaceTec Browser SDK (3.7MB WASM)
  → captures 3D FaceScan
  → sends encrypted to Anonimus Backend

Anonimus Backend (Node.js, Express)
  → receives encrypted FaceScan
  → forwards to FaceTec Server (localhost:8080 or self-hosted)
  → FaceTec Server returns: liveness result + confidence score
  → if liveness passed:
      → generates ephemeral credential (random 32 bytes)
      → issues Schnorr attestation (already implemented)
      → returns attestation to client
  → biometric artifacts: DELETED IMMEDIATELY
  → no FaceMap stored, no images stored

Client
  → receives attestation
  → generates ZK proof via Midnight
  → submits registration transaction
```

### What we DON'T need from FaceTec:
- 1:N face matching (not needed — uniqueness via nullifiers)
- FaceTec Dashboard (not needed for MVP)
- Photo ID scanning (not needed — just liveness)
- Age estimation (not needed)
- UR Codes (not needed)
- FaceVector storage (not needed — we discard after verification)
- Database (not needed — we delete immediately)

### What we DO need from FaceTec:
- 3D Liveness detection (the core value)
- Browser SDK (for webcam capture)
- Server-side processing (returns liveness result)

### Minimum integration:
1. Browser SDK → captures FaceScan → sends to your backend
2. Your backend → calls FaceTec Server `/process-request`
3. FaceTec Server → returns JSON with liveness result
4. Your backend → checks `isLivenessCheckPassed` boolean
5. If true → proceed with attestation
6. Delete all biometric data

---

## 8. Data lifecycle

```
Stage 1: Camera starts
  Browser: camera stream active
  FaceTec SDK: initializing
  Anonimus: not involved yet

Stage 2: Verification begins
  FaceTec SDK: prompts user for video selfie
  User: moves face as guided

Stage 3: Liveness data generated
  FaceTec SDK: captures 100+ frames over 2-3 seconds
  FaceTec SDK: performs initial liveness checks
  Data: 3D FaceScan (~430-515KB, encrypted)

Stage 4: FaceMap generated
  FaceTec SDK: creates encrypted 3D FaceMap (~80-300KB)
  Data: encrypted biometric template

Stage 5: FaceMap transmitted
  [DEV MODE]: sent to api.facetec.com ← FaceTec receives it
  [PROD MODE]: sent to your server ← FaceTec receives NOTHING

Stage 6: Verification occurs
  FaceTec Server (or cloud): processes liveness check
  Returns: JSON with isLivenessCheckPassed, confidenceScore

Stage 7: Result returned
  Anonimus backend: receives liveness result
  Anonimus backend: checks boolean result

Stage 8: Attestation created
  Anonimus backend: generates ephemeral credential
  Anonimus backend: issues Schnorr attestation
  Data: cryptographic attestation (NO biometric data)

Stage 9: Biometric artifacts deleted
  Anonimus backend: DELETES FaceScan, FaceMap, all biometric data
  Only remaining: liveness boolean + attestation

Stage 10: Registration proceeds
  Client: uses attestation for Midnight ZK proof
  Midnight: on-chain registration with nullifier
  Data on-chain: nullifier + commitment (NO biometric data)
```

### Data classification at each stage:

| Stage | Data | Type | Classification |
|-------|------|------|----------------|
| 3 | 3D FaceScan | Biometric | TEMPORARY, PRIVATE |
| 4 | 3D FaceMap | Biometric | TEMPORARY, PRIVATE |
| 5 | Encrypted FaceScan | Biometric | TEMPORARY, PRIVATE |
| 6 | Liveness result | Non-sensitive | TEMPORARY |
| 8 | Attestation | Cryptographic | PRIVATE (user-held) |
| 9 | Nothing | - | DELETED |
| 10 | Nullifier | Cryptographic | PUBLIC, ON-CHAIN |

---

## 9. Threat model

### Malicious frontend
- **Threat**: Frontend bypasses FaceTec SDK, submits fake liveness
- **Impact**: Fake attestation issued
- **Prevention**: FaceTec SDK generates encrypted FaceScan with session token; server validates
- **Mitigation**: Server must validate session token and FaceScan signature

### Malicious backend operator
- **Threat**: Backend issues attestations without real liveness
- **Impact**: Fake personhood credentials
- **Prevention**: This is a TRUST ASSUMPTION — backend is the trusted verifier
- **Mitigation**: In production, a real personhood provider replaces the backend's role

### Database compromise
- **Threat**: Attacker accesses stored FaceMaps
- **Impact**: Biometric data exposed
- **Prevention**: Don't store FaceMaps (delete immediately after verification)
- **Mitigation**: Anonimus architecture deletes all biometric artifacts

### FaceMap theft
- **Threat**: Attacker steals FaceMap in transit
- **Impact**: Could replay for re-verification (NOT for initial liveness)
- **Prevention**: FaceMap is encrypted; liveness data is time-stamped and session-bound
- **Mitigation**: Liveness data expires in minutes; new liveness required per session

### FaceTec credential/license compromise
- **Threat**: Attacker obtains your FaceTec keys
- **Impact**: Could use your account for verification, or impersonate your app
- **Prevention**: Keep server keys in environment variables
- **Mitigation**: Monitor usage logs; keys can be rotated

### Browser compromise
- **Threat**: Attacker intercepts FaceScan before encryption
- **Impact**: Raw biometric data exposed
- **Prevention**: FaceTec SDK encrypts immediately upon capture
- **Mitigation**: HTTPS in transit; encrypted FaceMaps

### Replay of verification result
- **Threat**: Reuse a liveness result for multiple registrations
- **Impact**: Multiple credentials from one liveness check
- **Prevention**: Each liveness session has unique session token
- **Mitigation**: Backend should consume each liveness result exactly once

### Reusing one attestation
- **Threat**: Same attestation used across campaigns
- **Impact**: Cross-campaign linkability
- **Prevention**: Already handled — nullifiers are campaign-scoped
- **Mitigation**: Already implemented in Anonimus

### Cross-campaign tracking
- **Threat**: Linking wallet to biometric identity
- **Impact**: Privacy violation
- **Prevention**: No biometric data in attestation or on-chain
- **Mitigation**: Nullifiers are unlinkable across campaigns

### Logs accidentally containing sensitive information
- **Threat**: FaceTec or Anonimus logs contain face data
- **Impact**: Biometric data in logs
- **Prevention**: FaceTec logs contain metadata only, not biometric data
- **Mitigation**: Configure FaceTec Server to minimize logging

---

## 10. FaceTec vs current face-api.js vs alternative

### OPTION A: Current face-api.js

| Category | Score | Notes |
|----------|-------|-------|
| Cost | 10/10 | Free, open source |
| Privacy | 10/10 | All processing client-side, no data leaves browser |
| Liveness capability | 2/10 | Basic spatial checks only — NOT genuine liveness |
| Personhood capability | 1/10 | A photograph passes all checks |
| Infrastructure | 10/10 | Zero infrastructure needed |
| Complexity | 9/10 | Simple integration |
| Reliability | 6/10 | Basic checks, many false positives/negatives |
| Hackathon viability | 8/10 | Works for demo, but lacks credibility |
| Licensing | 10/10 | MIT license |
| Long-term viability | 3/10 | Not suitable for production |

### OPTION B: FaceTec self-hosted

| Category | Score | Notes |
|----------|-------|-------|
| Cost | 4/10 | Free for dev, paid for production (unknown minimum) |
| Privacy | 9/10 | Self-hosted = no data to FaceTec (production mode) |
| Liveness capability | 10/10 | Certified Level 4 anti-spoofing, $600K bounty program |
| Personhood capability | 9/10 | Industry-leading liveness + face matching |
| Infrastructure | 6/10 | Docker on laptop for dev; cloud server for production |
| Complexity | 5/10 | Moderate — Docker + SDK integration |
| Reliability | 9/10 | 4 billion+ liveness checks performed |
| Hackathon viability | 7/10 | Free dev mode works for demo; production requires payment |
| Licensing | 5/10 | Free dev, commercial production |
| Long-term viability | 9/10 | Industry standard, used by Tinder, Hinge, etc. |

### OPTION C: Open-source alternatives

**face-auth** (GitHub: aashup/face-auth)
- Open-source liveness detection for React Native
- Uses TFLite models (BlazeFace, FaceNet, MiniFASNet)
- Offline-first, no data leaves device
- Mobile-only (not browser)
- Not production-certified
- Score: 4/10 for Anonimus (wrong platform, uncertified)

**Other open-source liveness projects**:
- Most are research prototypes, not production-ready
- None have the certifications FaceTec has (ISO 30107-3, Praetorian Level 4)
- None have the browser SDK that Anonimus needs
- Most require Python backend + GPU
- Score: 3/10 for Anonimus (wrong platform, uncertified, unproven)

**No genuinely relevant alternative exists** that:
1. Works in browsers
2. Provides certified liveness
3. Is free for production
4. Is self-hostable

---

## 11. Database implications

### Does FaceTec require additional persistent database?

**For Anonimus's use case: NO.**

FaceTec Server stores FaceMaps by default (for Dashboard and re-verification). But:
1. Anonimus only needs liveness detection, not face matching
2. After liveness check passes, Anonimus generates an ephemeral credential
3. All biometric artifacts can be deleted immediately
4. The FaceTec Server's database is not needed for Anonimus's flow

### Can Anonimus perform verification and immediately discard biometric artifacts?

**YES.** The flow is:
1. FaceTec Server processes liveness check
2. Returns JSON: `{ isLivenessCheckPassed: true, confidenceScore: 99.5 }`
3. Anonimus backend checks the boolean
4. If true → generate credential + attestation
5. Delete all FaceTec-related data (FaceScan, FaceMap, images)
6. Only the attestation (cryptographic, non-biometric) is retained

### What about FaceTec Server's default storage?

The FaceTec Server has two configuration modes:
- **Prebuilt Configuration**: Stores FaceMaps, images, metadata by default (for Dashboard)
- **Recompiled Configuration**: Your code controls storage (you decide what to store)

For Anonimus, use the Recompiled Configuration and simply don't store anything.

**Source**: dev.facetec.com/technical-specs

---

## 12. Hackathon suitability

### Can a zero-budget solo builder realistically use FaceTec?

**For development and demo: YES.**
- Free developer account
- Free SDKs
- Free Testing API
- Local Docker server for development
- Browser SDK works on any webcam

**For production: NO (without funding).**
- Monthly minimum commitment required
- Exact pricing unknown
- Requires commercial agreement

### Best hackathon strategy:
1. Use FaceTec in development mode for the demo
2. Show the architecture with self-hosted server capability
3. Document the production upgrade path
4. Be honest about development vs production mode

### What to tell judges:
> "We use FaceTec for liveness detection. In development, we use their Testing API. In production, the FaceTec Server runs on our infrastructure, and no user biometric data ever leaves our servers. For this demo, we're in development mode."

---

## 13. GO / CONDITIONAL GO / NO-GO

### **CONDITIONAL GO**

### Conditions:
1. **For hackathon demo**: GO — use development mode (free, but FaceTec receives face data)
2. **For production**: CONDITIONAL — requires commercial agreement + monthly payment
3. **For privacy claim**: GO with caveat — can honestly claim "production mode keeps data local" but must acknowledge development mode sends data to FaceTec

### Specific answers:

1. **Can a zero-budget solo builder realistically use FaceTec?**
   YES for development/demo. NO for production without funding.

2. **Can it be self-hosted?**
   YES. Docker-based, runs on Linux, documented for local development.

3. **Can biometric data avoid FaceTec's infrastructure?**
   ONLY in production mode with self-hosted server. NOT in development mode.

4. **Can biometric artifacts be deleted after verification?**
   YES. Anonimus's architecture discards all biometric data after liveness check.

5. **Can the system avoid building a biometric database?**
   YES. No FaceMap storage required for Anonimus's use case.

6. **Can it work on a laptop during development?**
   YES. Docker on localhost, Browser SDK on localhost:8080.

7. **What does the license key actually expose?**
   The key itself exposes nothing biometric. It enables SDK authentication and (in dev mode) data collection to FaceTec.

8. **What is the minimum infrastructure required?**
   Development: Docker on laptop. Production: Docker on cloud server + database.

9. **What is the biggest unresolved risk?**
   Production pricing is unknown ("Get a Quote"). If monthly minimums are high, it's not viable for a solo builder.

10. **What should we do NEXT?**
    - Option A: Use FaceTec in dev mode for hackathon, be transparent about it
    - Option B: Request a pricing quote to understand production costs
    - Option C: Stick with face-api.js for now, integrate FaceTec post-hackathon when funded

---

## 14. Biggest risks

1. **Unknown production pricing**: Monthly minimum commitment could be $100s/month
2. **Development mode sends face data to FaceTec**: Cannot claim "zero biometric data to third parties" in dev mode
3. **License key management**: Must keep server-side keys secure
4. **FaceTec Server resource usage**: Java + Docker + database on production server
5. **Platform lock-in**: FaceTec's proprietary SDKs are not interchangeable

---

## 15. Recommended next step

### For the hackathon:

**Use FaceTec in development mode** with full transparency:

1. Create free developer account at dev.facetec.com
2. Download Browser SDK + Server Docker image
3. Integrate Browser SDK into Anonimus frontend
4. Run FaceTec Server locally in Docker
5. Replace face-api.js with FaceTec liveness check
6. Keep the same attestation → ZK → Midnight flow
7. Document: "Development mode uses FaceTec Testing API. Production mode will use self-hosted FaceTec Server with zero biometric data sent to FaceTec."

### For production (post-hackathon):

1. Request a pricing quote from FaceTec
2. Evaluate if monthly minimums are sustainable
3. If yes: deploy FaceTec Server on cloud infrastructure
4. If no: evaluate alternative liveness providers or accept the limitation

### Privacy claims (honest):

**Development mode**:
> "Anonimus uses FaceTec's browser-based 3D liveness detection. In development mode, encrypted biometric data is processed by FaceTec's Testing API. No biometric data is stored by Anonimus or shared with third parties beyond FaceTec's processing."

**Production mode**:
> "Anonimus uses FaceTec software running entirely on our own server. User biometric data never leaves our infrastructure. We do not store biometric data after verification. FaceTec does not receive, process, or retain any user biometric information."

---

## Sources

| Claim | Source | Status |
|-------|--------|--------|
| FaceTec Server runs 100% in your private cloud | dev.facetec.com/configuration-options | VERIFIED |
| Development keys send face data to FaceTec | dev.facetec.com/privacy-sdk, dev.facetec.com/terms §43-44 | VERIFIED |
| Production keys send no biometric data to FaceTec | dev.facetec.com/privacy-sdk | VERIFIED |
| Free developer account available | facetec.com/developers | VERIFIED |
| Browser SDK is ~3.7MB | dev.facetec.com/technical-specs | VERIFIED |
| 3D FaceScan is ~430-515KB | dev.facetec.com/technical-specs | VERIFIED |
| Testing API limits: 50 req/min, 100 devices | dev.facetec.com/api-test-api-requirements | VERIFIED |
| FaceTec Server runs in Docker | dev.facetec.com/server-sdk-overview | VERIFIED |
| Windows/Mac via Docker for development only | dev.facetec.com/technical-specs | VERIFIED |
| Production requires monthly minimum commitment | facetec.com/pricing | VERIFIED |
| Exact production pricing not public | facetec.com/pricing | VERIFIED |
| FaceVector contains no image data | dev.facetec.com/ | VERIFIED |
| 4 billion+ liveness checks performed | facetec.com | VERIFIED |
| Level 4 anti-spoofing certified | Praetorian Security certification | VERIFIED |
| Server can run on localhost for development | dev.facetec.com/server-sdk-overview | VERIFIED |
| Production keys require usage logs to FaceTec | dev.facetec.com/faq | VERIFIED |
| License is royalty-free for development | dev.facetec.com/terms §18 | VERIFIED |
| Cannot charge end users for FaceTec features | dev.facetec.com/terms §35 | VERIFIED |
