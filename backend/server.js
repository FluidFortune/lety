// Pisces Moon OS — Lety Build Backend
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Cloud compile service for Lety. Receives C++ source via POST,
// runs PlatformIO, returns compiled binary as base64.
//
// DEPLOYMENT:
//   This is designed for a long-running Linux host with PlatformIO
//   pre-installed (NOT Vercel serverless — PlatformIO compile is too slow
//   for Vercel's 10s timeout on free tier). Recommended:
//     - Fly.io (machines run only when needed, sleeps when idle)
//     - Railway.app (similar)
//     - Self-hosted VPS (DigitalOcean, Hetzner)
//     - Your own machine with ngrok during development
//
// SETUP:
//   1. Install Node 20+, Python 3, PlatformIO, ESP32 toolchain:
//      pip install platformio
//      pio platform install espressif32
//   2. npm install express cors helmet rate-limiter-flexible
//   3. Set the PISCES_REPO_PATH env var to a clone of the Pisces Moon repo
//      (the backend uses this as the build template — your source is
//      dropped in as a new app file)
//   4. node server.js
//
// ENDPOINT:
//   POST /api/build
//     Body: { source: "...", app_type: "builtin"|"elf",
//             app_name: "my_app", target: "esp32s3", api_version: "1.0" }
//     Response (success):
//       { ok: true, binary: "<base64>", binary_size: N,
//         flash_address: 0x10000, partition: "factory" }
//     Response (failure):
//       { ok: false, errors: ["...", "..."], stage: "compile" }

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { promisify } from "util";

const exec = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 3000;
const PISCES_REPO_PATH = process.env.PISCES_REPO_PATH || "/opt/pisces-moon";
const MAX_SOURCE_SIZE = 256 * 1024;     // 256KB max app source
const BUILD_TIMEOUT_MS = 120 * 1000;    // 2 min per build

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    "https://lety.fluidfortune.com",
    "https://fluidfortune.com",
    "http://localhost:8080",
    "http://localhost:5173",
  ],
}));
app.use(express.json({ limit: "1mb" }));

// Rate limit: 30 builds per IP per hour
const limiter = new RateLimiterMemory({
  points: 30,
  duration: 3600,
});

app.use(async (req, res, next) => {
  if (req.path !== "/api/build") return next();
  try {
    await limiter.consume(req.ip);
    next();
  } catch (rej) {
    res.status(429).json({
      ok: false,
      errors: [`Rate limit exceeded. Try again in ${Math.ceil(rej.msBeforeNext / 1000)}s.`],
    });
  }
});

// ─────────────────────────────────────────────
//  SOURCE VALIDATION
//  Reject obviously malicious source before
//  spending CPU on compile.
// ─────────────────────────────────────────────
const FORBIDDEN_INCLUDES = [
  // Block attempts to access host filesystem from build
  "/etc/", "/proc/", "/sys/", "/dev/",
  "<unistd.h>", "<sys/", "<linux/",
  // Block shell escapes in macros
  "system(", "exec(", "fork(",
];

function validateSource(src) {
  if (typeof src !== "string") return "Source must be a string";
  if (src.length > MAX_SOURCE_SIZE) return `Source exceeds ${MAX_SOURCE_SIZE} bytes`;
  if (src.length < 50) return "Source too short — please write actual code";

  for (const term of FORBIDDEN_INCLUDES) {
    if (src.includes(term)) {
      return `Source contains forbidden pattern: ${term}`;
    }
  }

  // Must contain a function we can call
  if (!/\b(?:elf_main|run_\w+)\s*\(/.test(src)) {
    return "Source must define elf_main() or a run_*() function";
  }

  return null; // valid
}

// ─────────────────────────────────────────────
//  BUILD ORCHESTRATION
// ─────────────────────────────────────────────
async function buildSource({ source, app_type, app_name }) {
  // 1. Create isolated temp build directory by cloning the template repo
  const buildId = crypto.randomBytes(8).toString("hex");
  const buildDir = path.join(os.tmpdir(), `lety-${buildId}`);

  try {
    // Copy the Pisces Moon repo template into temp dir
    await exec("cp", ["-r", PISCES_REPO_PATH, buildDir], {
      timeout: 30000,
    });

    // 2. Drop user source into src/lety_app.cpp
    const srcPath = path.join(buildDir, "src", "lety_app.cpp");
    await fs.writeFile(srcPath, source, "utf8");

    // 3. For built-in apps, wire it into the launcher automatically
    if (app_type === "builtin") {
      await wireIntoLauncher(buildDir, source, app_name);
    }

    // 4. Run PlatformIO build
    let buildOutput, buildError;
    try {
      const result = await exec("pio", [
        "run",
        "-e", "esp32s3",
        "--project-dir", buildDir,
      ], {
        timeout: BUILD_TIMEOUT_MS,
        maxBuffer: 16 * 1024 * 1024,
      });
      buildOutput = result.stdout + result.stderr;
    } catch (err) {
      buildError = err.stdout + err.stderr + (err.message || "");
      const errorLines = extractCompileErrors(buildError);
      return { ok: false, errors: errorLines, stage: "compile" };
    }

    // 5. Read the resulting .bin file
    const binPath = path.join(buildDir, ".pio", "build", "esp32s3", "firmware.bin");
    const binData = await fs.readFile(binPath);
    const binaryB64 = binData.toString("base64");

    return {
      ok: true,
      binary: binaryB64,
      binary_size: binData.length,
      flash_address: 0x10000,
      partition: "factory",
    };
  } finally {
    // Cleanup temp dir
    try { await exec("rm", ["-rf", buildDir]); } catch (_) {}
  }
}

// ─────────────────────────────────────────────
//  AUTO-WIRE BUILT-IN APP INTO LAUNCHER
//  Adds declaration to apps.h and a launchApp case
// ─────────────────────────────────────────────
async function wireIntoLauncher(buildDir, source, appName) {
  // Find the run_*() function name in the source
  const m = source.match(/\bvoid\s+(run_\w+)\s*\(\s*\)\s*\{/);
  if (!m) throw new Error("No run_*() function found in source");
  const funcName = m[1];

  // Add declaration to include/apps.h
  const appsH = path.join(buildDir, "include", "apps.h");
  let appsContent = await fs.readFile(appsH, "utf8");

  if (!appsContent.includes(funcName)) {
    appsContent = appsContent.replace(
      /(#endif\s*$)/m,
      `\n// Lety user app\nvoid ${funcName}();\n\n$1`
    );
    await fs.writeFile(appsH, appsContent);
  }

  // Hook into launcher.cpp: add APP_LETY_USER define and a launchApp case
  const launcher = path.join(buildDir, "src", "launcher.cpp");
  let launcherContent = await fs.readFile(launcher, "utf8");

  if (!launcherContent.includes("APP_LETY_USER")) {
    // Add #define for new app ID
    launcherContent = launcherContent.replace(
      /(#define APP_BRIDGE\s+\d+[^\n]*)/,
      `$1\n#define APP_LETY_USER    99   // Lety-built user app`
    );

    // Add case to launchApp() switch
    launcherContent = launcherContent.replace(
      /(case APP_BRIDGE:\s+run_bridge\(\);[^\n]*)/,
      `$1\n        case APP_LETY_USER:    ${funcName}();                              break;`
    );

    // Wire into SYSTEM category
    launcherContent = launcherContent.replace(
      /(\{"BRIDGE",\s+APP_BRIDGE\}\}),\s+8\s+\}/,
      `$1,\n       {"${appName.toUpperCase().slice(0, 12)}", APP_LETY_USER}},\n      9 }`
    );

    await fs.writeFile(launcher, launcherContent);
  }
}

// ─────────────────────────────────────────────
//  EXTRACT COMPILE ERRORS FROM BUILD OUTPUT
// ─────────────────────────────────────────────
function extractCompileErrors(output) {
  const lines = output.split("\n");
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // GCC error format: file:line:col: error: message
    if (/error:/.test(line) || /undefined reference/.test(line)) {
      // Strip absolute paths to keep messages clean
      const cleaned = line.replace(/^[^:]*\/(src|include)\//, "$1/");
      errors.push(cleaned.trim());
      if (errors.length >= 20) break;
    }
  }

  if (errors.length === 0) {
    // Couldn't parse — return last 10 non-empty lines as a fallback
    return lines.filter(l => l.trim()).slice(-10);
  }

  return errors;
}

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────
app.post("/api/build", async (req, res) => {
  const { source, app_type, app_name } = req.body || {};

  // Validate
  const validationError = validateSource(source);
  if (validationError) {
    return res.status(400).json({
      ok: false,
      errors: [validationError],
      stage: "validate",
    });
  }

  if (!["builtin", "elf"].includes(app_type)) {
    return res.status(400).json({
      ok: false,
      errors: ["app_type must be 'builtin' or 'elf'"],
    });
  }

  console.log(`[BUILD] ${req.ip} → ${app_type}/${app_name} (${source.length}b)`);

  try {
    const result = await buildSource({ source, app_type, app_name });
    if (result.ok) {
      console.log(`[BUILD] ✓ ${result.binary_size}b for ${app_name}`);
    } else {
      console.log(`[BUILD] ✗ ${result.errors.length} errors`);
    }
    res.json(result);
  } catch (err) {
    console.error("[BUILD] Internal error:", err);
    res.status(500).json({
      ok: false,
      errors: ["Internal build error: " + err.message],
      stage: "internal",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "lety-build",
    version: "1.0.0",
    repo_path: PISCES_REPO_PATH,
  });
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Lety Build Service listening on port ${PORT}`);
  console.log(`Pisces repo: ${PISCES_REPO_PATH}`);
});
