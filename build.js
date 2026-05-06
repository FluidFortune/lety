// Pisces Moon OS — Lety Build & Flash Module
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// End-to-end browser-based development for Pisces Moon:
//   1. Source uploaded to compile backend
//   2. Backend runs PlatformIO, returns .bin
//   3. Browser flashes .bin to T-Deck via Web Serial (esptool-js)
//
// The user sees one button. Behind it: cloud build + flash in 30-90 seconds.

const LETY_BUILD_API = "https://lety-build.fluidfortune.com/api/build";
// ↑ Configure this to point at your deployed backend (see backend/README.md)

class LetyBuilder {
  constructor() {
    this.busy = false;
    this.statusHook = (state, msg) => {};
    this.progressHook = (pct) => {};
    this.consoleLog = (msg, type) => {};
  }

  // ─────────────────────────────────────────────
  //  CLOUD COMPILE
  //  POST source to backend, receive .bin
  // ─────────────────────────────────────────────
  async build(sourceCode, appType, appName) {
    if (this.busy) {
      throw new Error("Build already in progress");
    }
    this.busy = true;

    try {
      this.statusHook("compiling", "Submitting source to compile server...");
      this.progressHook(5);
      this.consoleLog("→ Connecting to lety-build.fluidfortune.com", "info");

      const res = await fetch(LETY_BUILD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source:    sourceCode,
          app_type:  appType,         // "builtin" or "elf"
          app_name:  appName || "my_app",
          target:    "esp32s3",
          api_version: "1.0"
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Build server returned ${res.status}: ${txt.slice(0, 200)}`);
      }

      this.progressHook(40);
      this.statusHook("compiling", "Compiling on server (this takes 30-90s)...");

      // Backend should stream progress, but a single response also works
      const result = await res.json();

      if (!result.ok) {
        // Compile failed — show error
        this.consoleLog("Compile failed:", "err");
        for (const line of (result.errors || ["Unknown error"])) {
          this.consoleLog("  " + line, "err");
        }
        throw new Error(result.errors?.[0] || "Compile failed");
      }

      this.progressHook(90);
      this.consoleLog(`✓ Compiled successfully (${result.binary_size} bytes)`, "info");

      // Backend returns base64-encoded binary
      const binaryB64 = result.binary;
      const binary = this._base64ToBytes(binaryB64);

      this.progressHook(100);
      return {
        binary:      binary,
        size:        binary.length,
        appType:     appType,
        appName:     appName,
        partition:   result.partition,    // "factory" for built-in, "spiffs/apps/" for ELF
        flashAddress: result.flash_address || 0x10000,
      };
    } finally {
      this.busy = false;
    }
  }

  _base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // ─────────────────────────────────────────────
  //  WEB SERIAL FLASH
  //  Uses esptool-js to flash compiled binary
  // ─────────────────────────────────────────────
  async flash(buildResult) {
    if (!("serial" in navigator)) {
      throw new Error("Web Serial API not supported. Use Chrome, Edge, or Opera on desktop.");
    }

    this.statusHook("connecting", "Requesting serial port...");
    this.consoleLog("→ Requesting USB serial port (select your T-Deck)", "info");

    let port;
    try {
      port = await navigator.serial.requestPort({
        // Show all serial devices — T-Deck appears as CP210x or USB CDC
        filters: []
      });
    } catch (err) {
      throw new Error("Port selection cancelled");
    }

    this.statusHook("connecting", "Opening port at 115200 baud...");
    await port.open({ baudRate: 115200 });

    this.consoleLog("✓ Port open", "info");

    try {
      // Load esptool-js dynamically
      this.statusHook("flashing", "Loading flash tool...");
      const { ESPLoader, Transport } = await this._loadEsptool();

      const transport = new Transport(port, true);
      const loader = new ESPLoader({
        transport: transport,
        baudrate: 115200,
        terminal: {
          clean: () => {},
          writeLine: (data) => this.consoleLog("[esptool] " + data, "info"),
          write: (data) => {},
        },
      });

      this.statusHook("flashing", "Detecting chip...");
      const chip = await loader.main();
      this.consoleLog(`✓ Detected: ${chip}`, "info");

      // ─── Reset into bootloader ───
      this.statusHook("flashing", "Entering bootloader...");

      // ─── Flash binary ───
      const fileArray = [{
        data: this._bytesToBinaryString(buildResult.binary),
        address: buildResult.flashAddress,
      }];

      this.statusHook("flashing", "Writing flash...");
      this.progressHook(0);

      await loader.writeFlash({
        fileArray: fileArray,
        flashSize: "16MB",
        flashMode: "qio",
        flashFreq: "80m",
        eraseAll:  false,
        compress:  true,
        reportProgress: (fileIdx, written, total) => {
          const pct = Math.floor((written / total) * 100);
          this.progressHook(pct);
          this.statusHook("flashing", `Flashing ${pct}%...`);
        },
      });

      this.consoleLog("✓ Flash complete", "info");

      // ─── Reset device into application ───
      this.statusHook("resetting", "Resetting device...");
      await loader.hardReset();
      this.consoleLog("✓ Device reset — your app is running", "info");

      this.statusHook("done", "Flashed successfully");
    } finally {
      try { await port.close(); } catch (_) {}
    }
  }

  _bytesToBinaryString(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) {
      s += String.fromCharCode(bytes[i]);
    }
    return s;
  }

  // ─────────────────────────────────────────────
  //  ESPTOOL-JS LOADER
  //  Lazy-loaded so the IDE base bundle stays small
  // ─────────────────────────────────────────────
  async _loadEsptool() {
    if (window._esptoolModule) return window._esptoolModule;

    // esptool-js is the official Espressif port for browser flashing
    // https://github.com/espressif/esptool-js
    const mod = await import(
      "https://cdn.jsdelivr.net/npm/esptool-js@0.4.4/+esm"
    );
    window._esptoolModule = mod;
    return mod;
  }

  // ─────────────────────────────────────────────
  //  COMBINED BUILD + FLASH
  //  One-button experience the moonshot promised
  // ─────────────────────────────────────────────
  async buildAndFlash(sourceCode, appType, appName) {
    try {
      const result = await this.build(sourceCode, appType, appName);
      await this.flash(result);
      return { ok: true };
    } catch (err) {
      this.statusHook("error", err.message);
      this.consoleLog(`✗ ${err.message}`, "err");
      return { ok: false, error: err.message };
    }
  }
}
