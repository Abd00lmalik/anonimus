import http from 'node:http';
import crypto from 'node:crypto';
import pino from 'pino';

import {
  createReceipt,
  verifyReceipt,
  isValidNullifierFormat,
  type VerificationReceipt,
  type ReceiptSigningKey,
} from './receipt.js';

// ============================================================================
// PoH Integration Service — minimal HTTP endpoint for DApp integration.
//
// Flow:
//   1. DApp calls POST /verify with { sessionId, scope }.
//   2. Server creates a verification request, returns { requestId }.
//   3. User completes on-chain verification (off-browser, via wallet).
//   4. Server observes the on-chain transaction, extracts nullifier.
//   5. Server creates and signs a VerificationReceipt.
//   6. DApp polls GET /receipt/:requestId to retrieve the receipt.
//   7. DApp verifies the receipt signature and scope.
//
// Trust model:
//   - The DApp trusts this service's signing key.
//   - The service only signs after observing successful on-chain verification.
//   - The nullifier is unique per (credential, scope).
//   - Session binding: each request has a unique sessionId.
// ============================================================================

export type VerificationRequest = {
  readonly requestId: string;
  readonly sessionId: string;
  readonly scope: string;
  readonly status: 'pending' | 'verified' | 'failed';
  readonly createdAt: string;
  readonly receipt?: VerificationReceipt;
};

export type ServiceConfig = {
  readonly port: number;
  readonly signingKey: ReceiptSigningKey;
  /** Callback URL for the server to notify when verification completes. */
  readonly callbackUrl?: string;
};

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

/**
 * Create and configure the HTTP service.
 * Does NOT start listening — caller controls lifecycle.
 */
export function createService(config: ServiceConfig): http.Server {
  const requests = new Map<string, VerificationRequest>();

  async function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url ?? '/', `http://localhost:${config.port}`);

    // POST /verify — create a verification request
    if (req.method === 'POST' && url.pathname === '/verify') {
      const body = await readBody(req);
      const { sessionId, scope } = JSON.parse(body);

      if (!sessionId || typeof sessionId !== 'string') {
        sendJson(res, 400, { error: 'sessionId is required (string)' });
        return;
      }
      if (!scope || typeof scope !== 'string') {
        sendJson(res, 400, { error: 'scope is required (string)' });
        return;
      }

      // Deduplicate: if this sessionId already has a request, return it
      for (const req of requests.values()) {
        if (req.sessionId === sessionId && req.scope === scope) {
          sendJson(res, 200, { requestId: req.requestId, status: req.status });
          return;
        }
      }

      const requestId = crypto.randomUUID();
      const request: VerificationRequest = {
        requestId,
        sessionId,
        scope,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      requests.set(requestId, request);

      logger.info(`Verification request created: ${requestId} (session: ${sessionId}, scope: ${scope})`);
      sendJson(res, 201, { requestId, status: 'pending' });
      return;
    }

    // GET /receipt/:requestId — retrieve a verification receipt
    if (req.method === 'GET' && url.pathname.startsWith('/receipt/')) {
      const requestId = url.pathname.split('/receipt/')[1];
      if (!requestId) {
        sendJson(res, 400, { error: 'requestId required in path' });
        return;
      }

      const request = requests.get(requestId);
      if (!request) {
        sendJson(res, 404, { error: 'Request not found' });
        return;
      }

      if (request.status === 'pending') {
        sendJson(res, 200, { requestId, status: 'pending' });
        return;
      }

      if (request.status === 'failed') {
        sendJson(res, 200, { requestId, status: 'failed' });
        return;
      }

      sendJson(res, 200, {
        requestId,
        status: 'verified',
        receipt: request.receipt,
      });
      return;
    }

    // POST /complete — server observes on-chain verification, creates receipt
    // In production this would be triggered by chain monitoring.
    // For the MVP/test flow, the admin calls this explicitly after verifying
    // the on-chain transaction succeeded.
    if (req.method === 'POST' && url.pathname === '/complete') {
      const body = await readBody(req);
      const { requestId, nullifier } = JSON.parse(body);

      if (!requestId || typeof requestId !== 'string') {
        sendJson(res, 400, { error: 'requestId is required' });
        return;
      }
      if (!nullifier || typeof nullifier !== 'string') {
        sendJson(res, 400, { error: 'nullifier is required' });
        return;
      }
      if (!isValidNullifierFormat(nullifier)) {
        sendJson(res, 400, { error: 'Invalid nullifier format (expected 64 hex chars)' });
        return;
      }

      const request = requests.get(requestId);
      if (!request) {
        sendJson(res, 404, { error: 'Request not found' });
        return;
      }
      if (request.status !== 'pending') {
        sendJson(res, 409, { error: `Request already ${request.status}` });
        return;
      }

      // Create and sign the receipt
      const receipt = createReceipt(
        nullifier,
        request.scope,
        request.sessionId,
        config.signingKey,
      );

      // Update the request
      const updated: VerificationRequest = {
        ...request,
        status: 'verified',
        receipt,
      };
      requests.set(requestId, updated);

      logger.info(`Verification completed: ${requestId} (nullifier: ${nullifier.slice(0, 16)}...)`);

      // Optional callback to DApp
      if (config.callbackUrl) {
        try {
          await fetch(config.callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, status: 'verified', receipt }),
          });
          logger.info(`Callback sent to ${config.callbackUrl}`);
        } catch (err) {
          logger.warn(`Callback failed: ${err}`);
        }
      }

      sendJson(res, 200, { requestId, status: 'verified', receipt });
      return;
    }

    // POST /fail — mark a request as failed
    if (req.method === 'POST' && url.pathname === '/fail') {
      const body = await readBody(req);
      const { requestId, reason } = JSON.parse(body);

      const request = requests.get(requestId);
      if (!request) {
        sendJson(res, 404, { error: 'Request not found' });
        return;
      }

      requests.set(requestId, { ...request, status: 'failed' });
      sendJson(res, 200, { requestId, status: 'failed', reason });
      return;
    }

    // GET /health — health check
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { status: 'ok', requests: requests.size });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  }

  const server = http.createServer(async (req, res) => {
    try {
      await handleRequest(req, res);
    } catch (err) {
      logger.error(`Request error: ${err}`);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  });

  return server;
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}
