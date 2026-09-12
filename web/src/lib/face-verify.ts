import * as faceapi from 'face-api.js';

// ============================================================================
// Face Verification Module — client-side face detection + spatial checks
//
// PRIVACY: All processing happens on the user's device.
// No face images, embeddings, or biometric data leave the browser.
//
// HONEST CAPABILITY CLAIM:
//   This module establishes:
//     - Face presence (a human face is visible in the camera)
//     - Face spatial quality (centered, large enough in frame)
//     - Temporal consistency (same face across multiple frames)
//
//   This module does NOT establish:
//     - Liveness (no 3D depth check, no blink detection, no movement check)
//     - Personhood (no identity verification, no government ID check)
//     - Uniqueness (no 1:N deduplication, no biometric template matching)
//     - Presentation attack detection (a photo or video would pass)
//
//   The term "liveness" in this codebase refers to basic spatial heuristics,
//   NOT to cryptographic or 3D liveness detection. A photograph of a face
//   would satisfy all checks in this module.
//
//   The actual "proof of humanity" claim is made by the backend verifier
//   service, which issues a Schnorr attestation after the user completes
//   this face check. In the current development environment, the backend
//   trusts that face verification was completed. In production, a real
//   personhood provider (e.g., FaceTec) would replace this module.
// ============================================================================

const MODEL_URL = '/models';
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export interface LivenessResult {
  passed: boolean;
  checks: {
    faceDetected: boolean;
    faceCentered: boolean;
    faceLargeEnough: boolean;
    multipleFrames: boolean;
  };
  details: string;
}

// ── Model Loading ──

export async function loadFaceModels(
  onProgress?: (model: string, loaded: boolean) => void,
): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    try {
      onProgress?.('TinyFaceDetector', false);
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      onProgress?.('TinyFaceDetector', true);

      onProgress?.('FaceLandmark68Net', false);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      onProgress?.('FaceLandmark68Net', true);

      onProgress?.('FaceRecognitionNet', false);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      onProgress?.('FaceRecognitionNet', true);

      modelsLoaded = true;
    } catch (error) {
      loadingPromise = null;
      throw new Error(`Failed to load face models: ${error}`);
    }
  })();

  await loadingPromise;
}

export function areModelsReady(): boolean {
  return modelsLoaded;
}

// ── Face Detection + Embedding ──

export async function detectFace(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<{ detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>; embedding: Float32Array } | null> {
  if (!modelsLoaded) {
    throw new Error('Face models not loaded');
  }

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    detection,
    embedding: detection.descriptor,
  };
}

// ── Spatial Quality Checks (NOT liveness) ──

/**
 * Check basic spatial quality of the face in the video frame.
 *
 * This is NOT a liveness check. It verifies:
 *   - A face is present (face-api.js detection)
 *   - The face is roughly centered in the frame
 *   - The face is large enough (at least 15% of frame height)
 *   - The face is consistent across recent frames (cosine similarity > 0.7)
 *
 * A photograph, video recording, or mask would pass all these checks.
 * The name "checkLiveness" is retained for API compatibility but the
 * behavior is spatial quality checking, not liveness detection.
 */
export async function checkLiveness(
  video: HTMLVideoElement,
  previousEmbeddings: Float32Array[] = [],
): Promise<LivenessResult> {
  const checks = {
    faceDetected: false,
    faceCentered: false,
    faceLargeEnough: false,
    multipleFrames: false,
  };

  // Check 1: Face detected
  const result = await detectFace(video);
  if (!result) {
    return { passed: false, checks, details: 'No face detected' };
  }
  checks.faceDetected = true;

  const box = result.detection.detection.box;
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  // Check 2: Face centered (within 60% of frame center)
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const frameCenterX = videoWidth / 2;
  const frameCenterY = videoHeight / 2;
  const maxOffset = Math.min(videoWidth, videoHeight) * 0.3;

  if (
    Math.abs(centerX - frameCenterX) < maxOffset &&
    Math.abs(centerY - frameCenterY) < maxOffset
  ) {
    checks.faceCentered = true;
  }

  // Check 3: Face large enough (at least 15% of frame height)
  const faceRatio = box.height / videoHeight;
  if (faceRatio > 0.15) {
    checks.faceLargeEnough = true;
  }

  // Check 4: Temporal consistency (same face across recent frames)
  if (previousEmbeddings.length >= 2) {
    const currentEmbedding = result.embedding;
    const recentSimilarities = previousEmbeddings.slice(-3).map(prev => {
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < currentEmbedding.length; i++) {
        dot += currentEmbedding[i] * prev[i];
        normA += currentEmbedding[i] * currentEmbedding[i];
        normB += prev[i] * prev[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    });

    const avgSimilarity = recentSimilarities.reduce((a, b) => a + b, 0) / recentSimilarities.length;
    checks.multipleFrames = avgSimilarity > 0.7;
  } else {
    // Not enough frames yet — pass this check to allow single-frame capture
    checks.multipleFrames = true;
  }

  const passed = checks.faceDetected && checks.faceCentered && checks.faceLargeEnough && checks.multipleFrames;

  const failedChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return {
    passed,
    checks,
    details: passed
      ? 'All spatial quality checks passed'
      : `Failed: ${failedChecks.join(', ')}`,
  };
}

// ── Camera Management ──

export async function startCamera(
  video: HTMLVideoElement,
  width = 640,
  height = 480,
): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width, height, facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
}

export function stopCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject as MediaStream | null;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}
