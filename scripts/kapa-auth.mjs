#!/usr/bin/env node
// Kapa MCP OAuth helper for Anonimus development.
// Usage:
//   node scripts/kapa-auth.mjs start    # print login URL, catch callback, store tokens
//   node scripts/kapa-auth.mjs refresh  # refresh the access token
// Tokens are written to .env (never committed).

import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";

const AUTH_BASE = "https://mcp.kapa.ai/auth/public";
const CLIENT_ID = "68bd6ead-74a0-4b69-b40d-2a695c8645b6";
const CLIENT_SECRET = "e1af792b5d6c191e2257d6680a23cf2f7d6470a099fce5b35b5cd51d26494d9c";
const REDIRECT_URI = "http://localhost:8451/callback";
const ENV_FILE = ".env";
const STATE_FILE = ".kapa-auth-state.json";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function readEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeEnvVar(key, value) {
  const env = readEnv();
  env[key] = value;
  writeFileSync(
    ENV_FILE,
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n"
  );
}

async function exchangeCode(code, verifier) {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function refreshToken(refreshToken) {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function buildAuthUrl() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  writeFileSync(STATE_FILE, JSON.stringify({ verifier }));

  const url = new URL(`${AUTH_BASE}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function printUrl() {
  const url = buildAuthUrl();
  writeFileSync(".kapa-login-url.txt", url);
  console.log("Open this URL in your browser and sign in:");
  console.log(url);
  console.log("(also saved to .kapa-login-url.txt)");
}

async function wait() {
  console.log("Waiting for the browser callback on http://localhost:8451/callback ...");

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://localhost:8451");
    if (u.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    const err = u.searchParams.get("error");
    const code = u.searchParams.get("code");
    if (err || !code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<h3>Login failed: ${err ?? "no code"}</h3>`);
      console.error(`Callback error: ${err ?? "no code present"}`);
      server.close();
      process.exit(1);
    }
    try {
      const { verifier } = JSON.parse(readFileSync(STATE_FILE, "utf8"));
      const tokens = await exchangeCode(code, verifier);
      writeEnvVar("KAPA_MCP_ACCESS_TOKEN", tokens.access_token);
      if (tokens.refresh_token) writeEnvVar("KAPA_MCP_REFRESH_TOKEN", tokens.refresh_token);
      unlinkSync(STATE_FILE);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h3>Kapa MCP authorized. You can close this window.</h3>");
      console.log("✓ Tokens obtained and stored in .env (KAPA_MCP_ACCESS_TOKEN)");
      server.close();
      process.exit(0);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h3>Token exchange failed: ${e.message}</h3>`);
      console.error(e.message);
      server.close();
      process.exit(1);
    }
  });

  server.listen(8451, "127.0.0.1");
  // Give up after 9 minutes (runs inside a 10-min tool timeout).
  setTimeout(() => {
    console.error("Timed out waiting for browser callback.");
    server.close();
    process.exit(1);
  }, 9 * 60 * 1000).unref();
}

async function refresh() {
  const env = readEnv();
  if (!env.KAPA_MCP_REFRESH_TOKEN) {
    console.error("No KAPA_MCP_REFRESH_TOKEN in .env — run `node scripts/kapa-auth.mjs start` first.");
    process.exit(1);
  }
  const tokens = await refreshToken(env.KAPA_MCP_REFRESH_TOKEN);
  writeEnvVar("KAPA_MCP_ACCESS_TOKEN", tokens.access_token);
  if (tokens.refresh_token) writeEnvVar("KAPA_MCP_REFRESH_TOKEN", tokens.refresh_token);
  console.log("✓ Access token refreshed.");
}

const cmd = process.argv[2];
if (cmd === "start" || cmd === "url") printUrl();
else if (cmd === "wait") await wait();
else if (cmd === "refresh") await refresh();
else {
  console.error("Usage: node scripts/kapa-auth.mjs <start|url|wait|refresh>");
  process.exit(1);
}
