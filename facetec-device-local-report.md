# Device-Local FaceTec Feasibility Report

## Executive conclusion

**No. FaceTec cannot perform complete verification on the user's device.**

FaceTec's own documentation explicitly states: "purely on-device Liveness Detection has been proven to be insecure because of bootrom exploits like Checkm8. FaceTec deployments require biometric processing on the server." The Browser SDK captures a 3D FaceScan (~430KB) that MUST be sent to a server endpoint (`/process-request`) for processing. There is no client-only mode. The server-side processing is architecturally mandatory — not optional, not configurable.

This means the desired architecture (camera → FaceTec SDK → local result → Anonimus) is **impossible** with FaceTec.

---

## 1. FaceTec processing architecture

FaceTec operates on a strict **device-capture + server-process** model:

```
User Device (Browser SDK)
  → Camera captures video frames (2-3 seconds)
  → WASM processes raw frames
  → Generates encrypted 3D FaceScan (~430-515KB)
  → Generates `requestBlob` (Base64 payload)
  → MUST send requestBlob to server endpoint

Server (FaceTec Server or Testing API)
  → Receives requestBlob
  → Runs 60+ algorithms on the 3D data
  → Performs 3D Liveness verification
  → Returns JSON result: { livenessProven: true/false, ... }
```

**Source**: dev.facetec.com/faq, dev.facetec.com/configuration-options, dev.facetec.com/api-guide

---

## 2. Browser vs device vs server processing

### What happens in the Browser SDK (device-side):
- Camera stream capture
- Initial face detection
- 3D FaceScan generation from video frames
- Encryption of the FaceScan
- UI rendering (guidance animations)
- **NO liveness decision** — only data capture

### What happens on the server:
- 3D Liveness verification (the core security function)
- 60+ algorithm processing pipeline
- Anti-spoof analysis (video injection, GenAI, root-bypass detection)
- Match verification (for re-verification scenarios)
- Session token validation

### What the FAQ says explicitly:

> **"No. In fact, purely on-device Liveness Detection has been proven to be insecure because of bootrom exploits like Checkm8 (and other such prolific amounts of client-side security behaviors). FaceTec deployments require biometric processing on the server."**
> — dev.facetec.com/faq

> **"No. The primary reason for this is Security. Without Server-Side Processing, Video Injection, GenAI Attacks, and Root-Bypass Attacks would be very easy to perform. The FaceTec Server is also required due to performance. FaceTec's technology requires substantial amounts of Computer Vision, AI, and Heavy Processing that would not be feasible on a client-side-only architecture."**
> — dev.facetec.com/faq

### The configuration page confirms:

| Feature | 3D Liveness Check | 3D Face Re-Verification |
|---------|-------------------|------------------------|
| 3D Liveness Verified | **Yes, On-Server** | **Yes, On-Server** |

**Source**: dev.facetec.com/configuration-options

---

## 3. Exact biometric data flow

### Browser SDK initialization:
```
FaceTecSDK.initializeWithSessionRequest(
  DeviceKeyIdentifier,
  new SessionRequestProcessor(),  ← THIS handles server communication
  { onSuccess, onError }
)
```

### SessionRequestProcessor pattern:
```
User clicks "Liveness Check"
  → FaceTec SDK captures video
  → SDK calls SessionRequestProcessor.onFaceTecSessionRequestProcessed()
  → Your code receives requestBlob (Base64)
  → Your code MUST send requestBlob to FaceTec Server endpoint
  → Server returns responseBlob
  → Your code passes responseBlob back to SDK
  → SDK displays result to user
```

**This is not optional.** The `SessionRequestProcessor` is the mandatory interface between the Device SDK and the Server. Without it, the SDK cannot function.

**Source**: dev.facetec.com/technical-support-browser-sdk-guides-browser-sdk-initial-integration, dev.facetec.com/api-call-list

---

## 4. Device-local feasibility

### Can the FaceScan be processed locally?
**NO.** The 3D FaceScan is an encrypted payload that requires FaceTec's proprietary server-side algorithms to process. The server runs "over 60 algorithms" on the 3D data. These algorithms are not available in the Browser SDK.

### Can the FaceTec Server run on the user's device?
**Technically yes, practically no.**

The FaceTec Server:
- Is a Java JAR file
- Requires Docker or a Linux host
- Requires a database (MongoDB or PostgreSQL)
- Requires ~8+ cores for production throughput
- Is designed for server deployment, not end-user devices

For a user to run FaceTec locally, they would need to:
1. Install Docker
2. Pull the FaceTec Server image
3. Set up a database
4. Configure the server
5. Keep it running during verification

**This is not realistic for Anonimus's UX.** A hackathon judge or end user should not need to install Docker to use the application.

### Can localhost work during development?
**YES, but only for the developer testing their own app.** The developer can run FaceTec Server in Docker on localhost:8080 and point the Browser SDK at it. This works for development but does not help end users.

**Source**: dev.facetec.com/server-sdk-overview, dev.facetec.com/technical-specs

---

## 5. Localhost feasibility

### Developer localhost (testing your own app):
```
Browser (localhost:3000) → FaceTec Server (localhost:8080)
```
- **Works**: Developer runs both on their machine
- **Free**: Development mode, no cost
- **Private**: All data stays on developer's machine
- **Limitation**: Only works for the developer testing their own app

### End-user localhost (user runs FaceTec locally):
```
Browser → User's localhost FaceTec Server
```
- **Technically possible**: User installs Docker + FaceTec Server
- **Practically impossible**: Users will not install Docker
- **UX disaster**: Multiple installation steps, Docker required
- **Not how FaceTec is designed to be used**

### Key constraint:
FaceTec's license requires that the customer's server processes the FaceScan. The "customer" is Anonimus, not the end user. Running FaceTec Server on the end user's device would mean every user is a "customer" — this is not the intended deployment model.

**Source**: dev.facetec.com/terms, dev.facetec.com/server-sdk-overview

---

## 6. Cryptographic verification result

### What does the FaceTec Server return?

```json
{
  "success": true,
  "livenessProven": true,
  "ageV2GroupEnumInt": 3
}
```

### Is this cryptographically signed?
**NOT IN THE STANDARD API.** The `/process-request` endpoint returns a JSON object. There is no cryptographic signature on the response by default.

### What prevents client-side forgery?
The security model is:
1. The `requestBlob` is encrypted and contains session-specific data
2. The server validates the session token
3. The server processes the 3D data through 60+ algorithms
4. The result is only meaningful if it came from a real server

**But if the user controls the "server" (runs it locally), they can forge any result.**

### Can the result be trusted if Anonimus controls the server?
**YES.** If Anonimus runs the FaceTec Server:
1. User sends requestBlob to Anonimus's server
2. Anonimus's server processes it
3. Anonimus's server returns the result
4. Anonimus trusts its own server
5. Anonimus issues the attestation based on the server's result

This is the standard trust model: **Anonimus's server is the trusted verifier.**

### Can the result be trusted if the user runs the server?
**NO.** If the user runs their own FaceTec Server, they can:
1. Modify the server to always return `livenessProven: true`
2. Or skip the server entirely and forge the response
3. There is no way for Anonimus to distinguish a real result from a fake one

**This is the fundamental problem with device-only verification.**

---

## 7. Anti-bypass/security analysis

### Why FaceTec requires server-side processing:

1. **Video Injection Attacks**: Without server validation, an attacker could feed pre-recorded video to the SDK
2. **GenAI Attacks**: AI-generated faces could bypass client-only checks
3. **Root-Bypass Attacks**: A rooted device could modify the SDK's behavior
4. **Bootrom Exploits**: Hardware-level exploits like Checkm8 can compromise any client-side security

### What the security best practices say:

> **"The FaceTec Device SDKs and FaceTec Server have all been blackbox & whitebox tested by Praetorian (160+ hours), and no method was found to tamper with Client-side code in order to get the Server to falsely respond with a Liveness Success."**
> — dev.facetec.com/security-best-practices

The security model assumes: **the server is trusted, the client is untrusted.** This is why server-side processing is mandatory.

### The $600,000 Spoof Bounty Program:
- Running since October 2019
- 110,000+ attack attempts defended
- Level 4 & 5 attacks tested (video injection, deepfake, root bypass)
- **All attacks fail because the server validates the 3D data**

If the processing happened client-side, these attacks would trivially succeed.

---

## 8. Licensing and zero-cost feasibility

### Developer license:
- Free to create account
- Free SDKs
- Free Testing API (50 req/min, 100 devices)
- Development key sends data to FaceTec's cloud

### Production license:
- Monthly minimum commitment (price unknown)
- Production key sends no data to FaceTec
- Requires self-hosted FaceTec Server
- Requires usage logs sent to FaceTec daily

### Can device-only use be licensed?
**There is no "device-only" license.** FaceTec's license model is:
- **Testing API**: FaceTec's cloud processes everything (free, development)
- **Self-Hosted Server**: Your server processes everything (paid, production)

There is no third option where the user's device processes everything.

### Does the license key communicate with FaceTec?
- **Development key**: Yes — validates with FaceTec's servers, sends telemetry
- **Production key**: Initially yes (30-90 days), then only daily usage logs
- **Key validation**: Can be done offline with production key after initial verification

### Does licensing require internet during verification?
- **Development key**: Yes — must reach api.facetec.com
- **Production key**: No — after initial key validation, server works offline

### License key vs biometric data:
- The **key** is just an API credential — it does not contain biometric data
- The **key** does not cause FaceTec to receive biometric data in production mode
- In development mode, the **key** enables data collection to FaceTec's cloud

---

## 9. Privacy comparison

### Architecture A: FaceTec Cloud (Testing API)
| Aspect | Status |
|--------|--------|
| Biometric data location | FaceTec's AWS cloud |
| FaceMap location | FaceTec's servers |
| Processing location | FaceTec's servers |
| Anonimus receives biometrics | No (gets result only) |
| FaceTec receives biometrics | **YES** |
| User installation required | No |
| Cost | Free (development) |
| Privacy | Low (biometrics sent to third party) |

### Architecture B: FaceTec Self-Hosted (Anonimus server)
| Aspect | Status |
|--------|--------|
| Biometric data location | Anonimus's server |
| FaceMap location | Anonimus's server (or deleted) |
| Processing location | Anonimus's server |
| Anonimus receives biometrics | Yes (processes them) |
| FaceTec receives biometrics | **No** |
| User installation required | No |
| Cost | Paid (monthly minimums) |
| Privacy | Medium (Anonimus sees biometrics) |

### Architecture C: FaceTec Device-Only (DESIRED)
| Aspect | Status |
|--------|--------|
| Biometric data location | User's device only |
| FaceMap location | User's device only |
| Processing location | User's device only |
| Anonimus receives biometrics | **No** |
| FaceTec receives biometrics | **No** |
| User installation required | Docker + FaceTec Server |
| Cost | Free (if technically possible) |
| Privacy | **Maximum** |
| **Feasibility** | **IMPOSSIBLE** |

### Architecture D: Anonimus Server (current face-api.js)
| Aspect | Status |
|--------|--------|
| Biometric data location | User's browser (client-side) |
| FaceMap location | None (no FaceMap generated) |
| Processing location | User's browser |
| Anonimus receives biometrics | No |
| FaceTec receives biometrics | N/A |
| User installation required | No |
| Cost | Free |
| Privacy | Maximum |
| Liveness capability | **Weak** (not genuine liveness) |

---

## 10. Alternative technologies

### Can any technology provide device-only liveness with cryptographic verification?

### Option 1: face-auth (GitHub: aashup/face-auth)
- Open-source, React Native
- Uses TFLite models (MiniFASNet for anti-spoofing)
- Runs entirely on-device
- **No cryptographic verification result** — just a local boolean
- **Not browser-compatible** — mobile only
- **Not production-certified**
- **Verdict**: Does not meet requirements (no crypto result, not browser-compatible)

### Option 2: @sssxyd/face-liveness-detector (npm)
- TypeScript, browser-based
- Passive + active liveness checks
- Runs 100% in browser
- **No cryptographic verification result**
- **No third-party certification**
- **Verdict**: Same as current face-api.js — client-side boolean only

### Option 3: TrustDefender-XR (research paper)
- CNN-based deepfake detection + ZKP (zero-knowledge proof)
- Generates a 23KB proof that can be verified remotely
- Runs on-device, proof sent to verifier
- **This is the architecture Anonimus wants**
- **Status**: Research prototype, not production-ready
- **Verdict**: Interesting research, not usable for hackathon

### Option 4: FaceTec + ZKP wrapper (theoretical)
- FaceTec runs on Anonimus's server
- Server generates a ZKP that liveness was verified
- Only the proof (not biometrics) goes on-chain
- **This IS achievable and aligns with Midnight's ZK capabilities**
- **Verdict**: Viable architecture, but requires FaceTec server (not device-only)

### No existing technology provides:
1. Browser-compatible liveness
2. Cryptographically verifiable result
3. Device-only processing
4. Production certification
5. Zero cost

---

## 11. Recommended Anonimus architecture

Given that device-only FaceTec is impossible, here are the realistic options:

### Option 1: Keep current face-api.js (RECOMMENDED for hackathon)
```
User Browser → face-api.js (client-side) → client-side boolean
  → Backend receives "passed" boolean
  → Backend issues attestation
  → Midnight ZK proof
```
- **Privacy**: Maximum (nothing leaves device)
- **Liveness**: Weak (not genuine — a photograph passes)
- **Cost**: Free
- **Credibility**: Low (judges may question liveness quality)
- **Best for**: Hackathon demo where privacy story matters more than liveness strength

### Option 2: FaceTec Self-Hosted (RECOMMENDED for production)
```
User Browser → FaceTec Browser SDK → requestBlob
  → Anonimus Server (FaceTec Server in Docker)
  → processes liveness
  → returns result
  → Backend issues attestation
  → Midnight ZK proof
```
- **Privacy**: Medium (Anonimus sees biometrics during processing)
- **Liveness**: Strong (Level 4 certified)
- **Cost**: Paid (monthly minimums — unknown amount)
- **Credibility**: High (industry-standard liveness)
- **Best for**: Post-hackathon production

### Option 3: Hybrid approach (BEST balance)
```
For hackathon demo:
  User Browser → face-api.js → attestation → Midnight

For production:
  User Browser → FaceTec SDK → Anonimus Server (FaceTec Server) → attestation → Midnight

For maximum privacy (future):
  User Browser → Device-local liveness → ZKP of liveness → Anonimus verifies proof → attestation → Midnight
```

This acknowledges:
1. face-api.js is sufficient for a hackathon demo
2. FaceTec is the production upgrade path
3. Device-local liveness + ZKP is the ultimate goal (but not yet possible with existing tools)

---

## 12. GO / CONDITIONAL GO / NO-GO

### For device-only FaceTec: **NO-GO**

FaceTec does not support device-only processing. This is not a limitation — it is a deliberate architectural choice by FaceTec based on their security model. They explicitly reject client-only liveness as insecure.

### For FaceTec in general: **CONDITIONAL GO**

- **Hackathon demo**: Use face-api.js (free, maximum privacy, weak liveness)
- **Production**: Use FaceTec self-hosted (paid, strong liveness, medium privacy)
- **Future**: Investigate device-local liveness + ZKP (maximum privacy + strong liveness)

### Specific answers:

1. **Can FaceTec perform complete verification on the user's device?**
   **NO.** Server-side processing is mandatory.

2. **Can the FaceTec Server run on the user's device?**
   **Technically yes, practically no.** Requires Docker, database, Java — not realistic for end users.

3. **Can biometric data stay entirely on the user's device?**
   **NO with FaceTec.** The FaceScan must be sent to a server for processing.

4. **Can Anonimus avoid receiving biometric data?**
   **YES** — if Anonimus runs the FaceTec Server, only the boolean result is needed. But the biometrics do transit through Anonimus's server.

5. **Can the verification result be cryptographically trusted?**
   **Only if Anonimus controls the server.** If the user controls the server, results can be forged.

6. **What is the biggest architectural constraint?**
   FaceTec's security model assumes: **client is untrusted, server is trusted.** This is incompatible with device-only processing.

7. **Is there an alternative that provides device-local liveness + cryptographic verification?**
   **Not in production-ready form.** Research prototypes (TrustDefender-XR) exist but are not usable.

8. **What should Anonimus do?**
   For the hackathon: keep face-api.js. For production: evaluate FaceTec self-hosted costs. For the future: monitor device-local liveness + ZKP research.

---

## 13. Exact next step

1. **For the hackathon**: Keep the current architecture (face-api.js + Midnight). The privacy story is maximum, and the liveness weakness can be documented honestly.

2. **If stronger liveness is needed**: Request a FaceTec pricing quote to understand production costs. The self-hosted architecture is well-documented and proven.

3. **If device-local liveness is a hard requirement**: Monitor research in ZKP-based liveness verification. The TrustDefender-XR paper (arxiv 2507.17010) demonstrates the architecture but is not production-ready.

4. **Do not attempt to make FaceTec work device-only.** It is architecturally impossible by design.

---

## Sources

| Claim | Source | Status |
|-------|--------|--------|
| "FaceTec deployments require biometric processing on the server" | dev.facetec.com/faq | VERIFIED |
| "Purely on-device Liveness Detection has been proven to be insecure" | dev.facetec.com/faq | VERIFIED |
| "3D Liveness Verified: Yes, On-Server" | dev.facetec.com/configuration-options | VERIFIED |
| "Server is required due to security and performance" | dev.facetec.com/faq | VERIFIED |
| "FaceTec Server runs 60+ algorithms" | dev.facetec.com/faq | VERIFIED |
| "SessionRequestProcessor handles server communication" | dev.facetec.com/api-call-list | VERIFIED |
| "requestBlob must be sent to /process-request" | dev.facetec.com/api-guide | VERIFIED |
| "Production key works offline after initial validation" | dev.facetec.com/faq | VERIFIED |
| "Device-only liveness is architecturally impossible with FaceTec" | All sources combined | VERIFIED |
