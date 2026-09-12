import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchCampaign } from '../lib/api'
import { useVerification } from '../contexts/VerificationContext'
import { useWallet } from '../contexts/WalletContext'
import {
  loadFaceModels,
  detectFace,
  checkLiveness,
  startCamera,
  stopCamera,
  type LivenessResult,
} from '../lib/face-verify'
import type { Campaign } from '../types'

function VerificationStep({ label, status, delay }: { label: string; status: 'pending' | 'active' | 'done' | 'error'; delay?: number }) {
  const colors = {
    pending: 'var(--text-muted)',
    active: 'var(--accent)',
    done: 'var(--success)',
    error: 'var(--error)',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: delay || 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `1.5px solid ${colors[status]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: status === 'done' ? 'rgba(143, 191, 154, 0.1)' : status === 'active' ? 'rgba(198, 163, 90, 0.1)' : 'transparent',
      }}>
        {status === 'done' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 6L5 8L9 4" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {status === 'active' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1.5s linear infinite' }}>
            <circle cx="6" cy="6" r="4" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="20 5" />
          </svg>
        )}
        {status === 'error' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 4L8 8M8 4L4 8" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.875rem',
        color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
        fontWeight: status === 'active' ? 500 : 400,
      }}>
        {label}
      </span>
    </motion.div>
  )
}

function VeiledCore() {
  return (
    <div style={{
      width: 200,
      height: 200,
      position: 'relative',
      margin: '0 auto',
    }}>
      <svg viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="80" fill="url(#core-glow)" />

        <g style={{ animation: 'spin 20s linear infinite', transformOrigin: '100px 100px' }}>
          <polygon
            points="100,30 160,70 160,130 100,170 40,130 40,70"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.4"
          />
          <polygon
            points="100,50 140,75 140,125 100,150 60,125 60,75"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.5"
            opacity="0.25"
          />
        </g>

        <g style={{ animation: 'spin 12s linear infinite reverse', transformOrigin: '100px 100px' }}>
          <polygon
            points="100,45 150,72 150,128 100,155 50,128 50,72"
            fill="none"
            stroke="var(--accent-hover)"
            strokeWidth="0.8"
            opacity="0.3"
            strokeDasharray="4 6"
          />
        </g>

        <circle cx="100" cy="100" r="6" fill="var(--accent)" opacity="0.6">
          <animate attributeName="r" values="5;7;5" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
        </circle>

        <circle cx="100" cy="100" r="18" fill="none" stroke="var(--accent)" strokeWidth="0.5" opacity="0.2" strokeDasharray="2 4">
          <animateTransform attributeName="transform" type="rotate" values="0 100 100;360 100 100" dur="25s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

// ── Face Verification Camera Component ──

function FaceVerificationCamera({ onLivenessPassed }: { onLivenessPassed: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsProgress, setModelsProgress] = useState<string>('')
  const [faceDetected, setFaceDetected] = useState(false)
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null)
  const [capturing, setCapturing] = useState(false)
  const previousEmbeddingsRef = useRef<Float32Array[]>([])
  const detectionIntervalRef = useRef<number | null>(null)

  // Load models on mount
  useEffect(() => {
    loadFaceModels((model, loaded) => {
      setModelsProgress(loaded ? `${model} loaded` : `Loading ${model}...`)
    })
      .then(() => setModelsLoading(false))
      .catch(err => console.error('Failed to load face models:', err))
  }, [])

  // Start camera when models are ready
  useEffect(() => {
    if (!modelsLoading && videoRef.current && !cameraActive) {
      startCamera(videoRef.current)
        .then(() => setCameraActive(true))
        .catch(err => console.error('Camera start failed:', err))
    }
  }, [modelsLoading, cameraActive])

  // Cleanup camera on unmount — stop all MediaStream tracks
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        stopCamera(videoRef.current)
      }
    }
  }, [])

  // Continuous face detection
  useEffect(() => {
    if (!cameraActive || !videoRef.current || modelsLoading) return

    const video = videoRef.current

    detectionIntervalRef.current = window.setInterval(async () => {
      if (!video || video.readyState < 2) return

      try {
        const result = await detectFace(video)
        setFaceDetected(!!result)

        if (result) {
          previousEmbeddingsRef.current.push(result.embedding)
          if (previousEmbeddingsRef.current.length > 5) {
            previousEmbeddingsRef.current = previousEmbeddingsRef.current.slice(-5)
          }
        }
      } catch {
        // Detection error — ignore
      }
    }, 400)

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [cameraActive, modelsLoading])

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || capturing) return
    setCapturing(true)

    try {
      const result = await checkLiveness(videoRef.current, previousEmbeddingsRef.current)
      setLivenessResult(result)

      if (result.passed) {
        stopCamera(videoRef.current)
        onLivenessPassed()
      }
    } catch (err) {
      console.error('Liveness check failed:', err)
      setLivenessResult({
        passed: false,
        checks: { faceDetected: false, faceCentered: false, faceLargeEnough: false, multipleFrames: false },
        details: 'Liveness check error',
      })
    } finally {
      setCapturing(false)
    }
  }, [capturing, onLivenessPassed])

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-6)',
      marginBottom: 'var(--space-8)',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.9375rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-4)',
      }}>
        Face Verification
      </h3>

      {/* Camera Feed */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: '#000',
        aspectRatio: '4/3',
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />

        {/* Face detection overlay */}
        {cameraActive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 180,
              height: 240,
              borderRadius: '50%',
              border: `3px solid ${faceDetected ? 'var(--success)' : 'rgba(255,255,255,0.3)'}`,
              transition: 'border-color 0.3s',
              boxShadow: faceDetected ? '0 0 20px rgba(143, 191, 154, 0.3)' : 'none',
            }} />
          </div>
        )}

        {/* Status badge */}
        {cameraActive && (
          <div style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <div style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-ui)',
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
              background: faceDetected ? 'rgba(143, 191, 154, 0.2)' : 'rgba(255,255,255,0.1)',
              color: faceDetected ? 'var(--success)' : '#fff',
              border: `1px solid ${faceDetected ? 'rgba(143, 191, 154, 0.3)' : 'rgba(255,255,255,0.2)'}`,
            }}>
              {faceDetected ? 'Face detected' : 'Position your face'}
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {modelsLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
          }}>
            <div style={{
              width: 24,
              height: 24,
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: '#fff' }}>
              {modelsProgress || 'Loading face models...'}
            </span>
          </div>
        )}
      </div>

      {/* Capture Button */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
        <button
          onClick={handleCapture}
          disabled={!faceDetected || capturing || modelsLoading}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.875rem',
            padding: '12px 32px',
            borderRadius: 'var(--radius-sm)',
            background: faceDetected && !capturing ? 'var(--accent)' : 'var(--bg-elevated)',
            color: faceDetected && !capturing ? 'var(--bg-primary)' : 'var(--text-muted)',
            border: 'none',
            cursor: faceDetected && !capturing ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            opacity: modelsLoading ? 0.5 : 1,
          }}
        >
          {capturing ? 'Checking face...' : 'Capture & Verify'}
        </button>
      </div>

      {/* Liveness Result */}
      {livenessResult && (
        <div style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-sm)',
          background: livenessResult.passed ? 'rgba(143, 191, 154, 0.08)' : 'rgba(201, 122, 114, 0.08)',
          border: `1px solid ${livenessResult.passed ? 'rgba(143, 191, 154, 0.2)' : 'rgba(201, 122, 114, 0.2)'}`,
        }}>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: livenessResult.passed ? 'var(--success)' : 'var(--error)',
            fontWeight: 500,
          }}>
            {livenessResult.passed ? 'Spatial quality checks passed' : livenessResult.details}
          </p>
        </div>
      )}

      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginTop: 'var(--space-3)',
        textAlign: 'center',
      }}>
        Your face data never leaves this device. All processing is local.
      </p>
    </div>
  )
}

// ── Main Verification Page ──

export function VerificationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { stage, campaign, startVerification, error } = useVerification()
  const { wallet } = useWallet()
  const [campaignData, setCampaignData] = useState<Campaign | null>(null)
  const [livenessPassed, setLivenessPassed] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchCampaign(id)
      .then(c => {
        const campaignObj: Campaign = {
          id: c.id,
          title: c.title,
          organizer: c.organizer,
          purpose: c.purpose,
          status: c.status === 'live' ? 'live' : 'ended',
          uniqueness: 'campaign-scoped',
          requirement: 'Personhood attestation required',
          deadline: c.endDate,
        }
        setCampaignData(campaignObj)
      })
      .catch(() => navigate('/campaigns'))
  }, [id, navigate])

  useEffect(() => {
    if (!campaign && campaignData) {
      navigate(`/campaigns/${campaignData.id}/join`)
    }
  }, [campaign, campaignData, navigate])

  const handleLivenessPassed = useCallback(() => {
    setLivenessPassed(true)
    // Start the real verification flow after liveness passes
    startVerification()
  }, [startVerification])

  if (!campaignData || !campaign) {
    return (
      <div style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const steps = [
    { label: 'Face verification', key: 'face-verification' },
    { label: 'Requesting attestation', key: 'preparing' },
    { label: 'Checking attestation validity', key: 'checking-attestation' },
    { label: 'Verifying uniqueness', key: 'checking-uniqueness' },
    { label: 'Registering', key: 'registering' },
  ]

  const stageOrder = ['face-verification', 'preparing', 'generating-proof', 'checking-attestation', 'checking-uniqueness', 'registering', 'success']
  const currentIdx = livenessPassed ? stageOrder.indexOf(stage) + 1 : 0

  if (stage === 'success') {
    navigate(`/campaigns/${campaignData.id}/success`)
    return null
  }

  if (stage === 'error') {
    return (
      <div style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--error)', marginBottom: 'var(--space-4)' }}>
            Verification failed
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            {error || 'Something went wrong during verification. Please try again.'}
          </p>
          <button
            onClick={() => navigate(`/campaigns/${campaignData.id}`)}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.875rem',
              padding: '12px 24px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Back to Campaign
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 'var(--space-3)',
          }}>
            {livenessPassed ? 'Processing' : 'Step 3 of 4'} — {livenessPassed ? 'Generating Proof' : 'Face Verification'}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            {livenessPassed ? 'Verifying your personhood' : 'Verify your face'}
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
          }}>
            {livenessPassed
              ? 'This may take a moment. Your proof is being generated locally.'
              : 'Position your face in the oval. All processing happens on your device.'}
          </p>
        </div>

        {!livenessPassed ? (
          <FaceVerificationCamera onLivenessPassed={handleLivenessPassed} />
        ) : (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-8)',
            marginBottom: 'var(--space-8)',
          }}>
            <VeiledCore />
          </div>
        )}

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5) var(--space-6)',
        }}>
          <AnimatePresence mode="wait">
            {steps.map((step, i) => {
              const stepIdx = stageOrder.indexOf(step.key)
              let status: 'pending' | 'active' | 'done' | 'error' = 'pending'
              if (currentIdx > stepIdx) status = 'done'
              else if (currentIdx === stepIdx) status = 'active'

              return (
                <VerificationStep
                  key={step.key}
                  label={step.label}
                  status={status}
                  delay={i * 0.05}
                />
              )
            })}
          </AnimatePresence>
        </div>

        {wallet.connected && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4" fill="var(--success)" />
            </svg>
            Wallet: {wallet.address}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
