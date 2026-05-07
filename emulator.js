// Pisces Moon OS — IDE Emulator Engine
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This module emulates Pisces Moon HAL behavior in JavaScript.
// User C++ code is transpiled to JS at runtime, then executed in
// a sandboxed Web Worker context so an infinite loop in the user
// app can't lock up the IDE.
//
// The transpiler is intentionally narrow — it recognizes Pisces Moon
// idioms (gfx->, get_touch, update_trackball, theme constants) and
// converts them to JS equivalents. C++ syntax that doesn't match the
// recognized patterns is preserved as-is and may not run.

class PiscesEmulator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");
    this.W = 320;
    this.H = 240;

    // Display state
    this.bg = "#000";
    this.cursorX = 0;
    this.cursorY = 0;
    this.textColor = "#fff";
    this.textSize  = 1;

    // Input state
    this.touch       = { x: 0, y: 0, pressed: false };
    this.trackball   = { x: 0, y: 0, click: false, lastUI: 0, lastGame: 0 };
    this.keyQueue    = [];

    // Runtime state
    this.running    = false;
    this.startTime  = 0;
    this.frameCount = 0;
    this.fpsLast    = 0;

    // Console hook (set by IDE)
    this.consoleLog = (msg, type) => {};
    this.fpsHook    = (fps) => {};

    this._bindInput();
  }

  _bindInput() {
    const c = this.canvas;
    c.tabIndex = 0;

    const updateTouch = (e) => {
      const rect = c.getBoundingClientRect();
      this.touch.x = Math.floor((e.clientX - rect.left) * (this.W / rect.width));
      this.touch.y = Math.floor((e.clientY - rect.top)  * (this.H / rect.height));
    };

    c.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        updateTouch(e);
        this.touch.pressed = true;
        c.focus();
      }
    });
    c.addEventListener("mouseup", () => this.touch.pressed = false);
    c.addEventListener("mouseleave", () => this.touch.pressed = false);
    c.addEventListener("mousemove", (e) => {
      if (this.touch.pressed) updateTouch(e);
    });

    c.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowUp")    { this.trackball.y = -1; e.preventDefault(); return; }
      if (k === "ArrowDown")  { this.trackball.y = 1;  e.preventDefault(); return; }
      if (k === "ArrowLeft")  { this.trackball.x = -1; e.preventDefault(); return; }
      if (k === "ArrowRight") { this.trackball.x = 1;  e.preventDefault(); return; }
      if (k === "Enter" && e.altKey) {
        this.trackball.click = true;
        e.preventDefault();
        return;
      }
      if (k === "Enter")     this.keyQueue.push(13);
      else if (k === "Backspace") this.keyQueue.push(8);
      else if (k.length === 1) this.keyQueue.push(k.charCodeAt(0));
    });

    c.addEventListener("keyup", (e) => {
      const k = e.key;
      if (k === "ArrowUp" || k === "ArrowDown")    this.trackball.y = 0;
      if (k === "ArrowLeft" || k === "ArrowRight") this.trackball.x = 0;
      if (k === "Enter") this.trackball.click = false;
    });
  }

  // ─────────────────────────────────────────────
  //  RGB565 → CSS color
  // ─────────────────────────────────────────────
  _color565(c) {
    const r = ((c >> 11) & 0x1F) << 3;
    const g = ((c >>  5) & 0x3F) << 2;
    const b = ( c        & 0x1F) << 3;
    return `rgb(${r},${g},${b})`;
  }

  // ─────────────────────────────────────────────
  //  GFX — drawing API exposed to user code
  //  All coords in 320×240 logical space
  // ─────────────────────────────────────────────
  fillScreen(color) {
    this.ctx.fillStyle = this._color565(color);
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = this._color565(color);
    this.ctx.fillRect(x, y, w, h);
  }

  drawRect(x, y, w, h, color) {
    this.ctx.strokeStyle = this._color565(color);
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  drawRoundRect(x, y, w, h, r, color) {
    this.ctx.strokeStyle = this._color565(color);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
    this.ctx.stroke();
  }

  fillRoundRect(x, y, w, h, r, color) {
    this.ctx.fillStyle = this._color565(color);
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, r);
    this.ctx.fill();
  }

  drawLine(x0, y0, x1, y1, color) {
    this.ctx.strokeStyle = this._color565(color);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x0 + 0.5, y0 + 0.5);
    this.ctx.lineTo(x1 + 0.5, y1 + 0.5);
    this.ctx.stroke();
  }

  drawFastHLine(x, y, w, color) { this.drawLine(x, y, x + w - 1, y, color); }
  drawFastVLine(x, y, h, color) { this.drawLine(x, y, x, y + h - 1, color); }

  drawCircle(cx, cy, r, color) {
    this.ctx.strokeStyle = this._color565(color);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  fillCircle(cx, cy, r, color) {
    this.ctx.fillStyle = this._color565(color);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  drawTriangle(x0, y0, x1, y1, x2, y2, color) {
    this.ctx.strokeStyle = this._color565(color);
    this.ctx.beginPath();
    this.ctx.moveTo(x0 + 0.5, y0 + 0.5);
    this.ctx.lineTo(x1 + 0.5, y1 + 0.5);
    this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  fillTriangle(x0, y0, x1, y1, x2, y2, color) {
    this.ctx.fillStyle = this._color565(color);
    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawPixel(x, y, color) {
    this.ctx.fillStyle = this._color565(color);
    this.ctx.fillRect(x, y, 1, 1);
  }

  setCursor(x, y) { this.cursorX = x; this.cursorY = y; }
  setTextColor(c) { this.textColor = this._color565(c); }
  setTextSize(s)  { this.textSize  = Math.max(1, s); }

  print(text) {
    text = String(text);
    const charW = 6 * this.textSize;
    const charH = 8 * this.textSize;
    this.ctx.fillStyle = this.textColor;
    this.ctx.font = `${charH}px ui-monospace, monospace`;
    this.ctx.textBaseline = "top";

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '\n') {
        this.cursorX = 0;
        this.cursorY += charH;
        continue;
      }
      this.ctx.fillText(c, this.cursorX, this.cursorY);
      this.cursorX += charW;
    }
  }

  println(text) { this.print(text); this.print('\n'); }

  printf(fmt, ...args) {
    let i = 0;
    const out = String(fmt).replace(/%[diuxXfs]/g, (m) => {
      const v = args[i++];
      if (m === "%d" || m === "%i") return Math.floor(v).toString();
      if (m === "%u") return Math.abs(Math.floor(v)).toString();
      if (m === "%x") return v.toString(16);
      if (m === "%X") return v.toString(16).toUpperCase();
      if (m === "%f") return Number(v).toFixed(2);
      if (m === "%s") return String(v);
      return m;
    });
    this.print(out);
  }

  // ─────────────────────────────────────────────
  //  INPUT API
  // ─────────────────────────────────────────────
  get_touch() {
    return this.touch.pressed
      ? { ok: true, x: this.touch.x, y: this.touch.y }
      : { ok: false, x: 0, y: 0 };
  }

  update_trackball() {
    const now = performance.now();
    const result = { x: 0, y: 0, clicked: false };
    if (this.trackball.click) {
      result.clicked = true;
      this.trackball.click = false;  // Edge-triggered
    }
    if ((this.trackball.x !== 0 || this.trackball.y !== 0) &&
        now - this.trackball.lastUI > 250) {
      result.x = this.trackball.x;
      result.y = this.trackball.y;
      this.trackball.lastUI = now;
    }
    return result;
  }

  update_trackball_game() {
    const now = performance.now();
    const result = { x: 0, y: 0, clicked: false };
    if (this.trackball.click) {
      result.clicked = true;
      this.trackball.click = false;
    }
    if ((this.trackball.x !== 0 || this.trackball.y !== 0) &&
        now - this.trackball.lastGame > 80) {
      result.x = this.trackball.x;
      result.y = this.trackball.y;
      this.trackball.lastGame = now;
    }
    return result;
  }

  get_keypress() {
    return this.keyQueue.length > 0 ? this.keyQueue.shift() : 0;
  }

  millis() {
    return Math.floor(performance.now() - this.startTime);
  }

  // ─────────────────────────────────────────────
  //  NFC / RFID EMULATION
  //  Mock mode — tag appears on auto-cycle, same
  //  behavior as nfc_sdl2.cpp in the desktop build:
  //    NFC: present 2s, absent 6s (8s cycle)
  //    RFID: present 1.5s, absent 8.5s (10s cycle)
  // ─────────────────────────────────────────────
  nfc_poll() {
    const t = this.millis() % 8000;
    return {
      valid:     t < 2000,
      type:      1,                    // NFC_TYPE_A
      uid_len:   7,
      uid:       [0x04, 0xA3, 0xF2, 0x11, 0xC2, 0x5E, 0x80],
      ndef_text: "Pisces Moon Dev Tag",
      data_len:  26,
      data:      [],
    };
  }

  rfid_poll() {
    const t = this.millis() % 10000;
    return {
      valid:  t < 1500,
      type:   1,                       // RFID_TYPE_EM4100
      id:     0x00DEADC0,
      id_str: "00DEADC0",
    };
  }

  nfc_write(tag, data, len) {
    this.consoleLog(`[NFC] Write ${len} bytes to tag UID=${tag.uid[0].toString(16)}...`, "info");
    return true;
  }

  // ─────────────────────────────────────────────
  //  MESH / LORA EMULATION
  //  Real LoRa TX only fires on hardware. In the
  //  preview, sends are logged and receives return
  //  no-message. Apps can preview their UI fully.
  // ─────────────────────────────────────────────
  mesh_send(target, msg) {
    this.consoleLog(`[MESH] TX → 0x${target.toString(16)}: ${msg}`, "info");
    return true;
  }

  mesh_receive() {
    return { valid: false, from: 0, to: 0, text: "", rssi: 0 };
  }

  mesh_node_id() {
    return 0xA1B2;   // Fixed mock ID for preview
  }

  // ─────────────────────────────────────────────
  //  NoSQL DATABASE EMULATION
  //  Mock implementation backed by JS Map. Persists
  //  for the lifetime of the page (lost on reload).
  //  Real apps store to /data/<category>/ on SD card.
  // ─────────────────────────────────────────────
  nosql_init(category) {
    if (!this._nosql) this._nosql = new Map();
    if (!this._nosql.has(category)) {
      this._nosql.set(category, []);
      this.consoleLog(`[NoSQL] Initialized category '${category}'`, "info");
    }
    return true;
  }

  nosql_save_entry(category, title, content, tags) {
    if (!this._nosql) this._nosql = new Map();
    if (!this._nosql.has(category)) this._nosql.set(category, []);
    const list = this._nosql.get(category);
    list.push({ title, content, tags: tags || "" });
    this.consoleLog(`[NoSQL] Saved entry "${title}" to ${category} (total: ${list.length})`, "info");
    return true;
  }

  nosql_get_count(category) {
    if (!this._nosql || !this._nosql.has(category)) return 0;
    return this._nosql.get(category).length;
  }

  nosql_get_entry(category, idx) {
    // Returns {ok, title, content} since C++ uses by-reference output params
    if (!this._nosql || !this._nosql.has(category)) {
      return { ok: false, title: "", content: "" };
    }
    const list = this._nosql.get(category);
    if (idx < 0 || idx >= list.length) {
      return { ok: false, title: "", content: "" };
    }
    return { ok: true, title: list[idx].title, content: list[idx].content };
  }

  nosql_search(category, keyword) {
    if (!this._nosql || !this._nosql.has(category)) {
      return { ok: false, title: "", content: "" };
    }
    const kw = keyword.toLowerCase();
    for (const e of this._nosql.get(category)) {
      if (e.title.toLowerCase().includes(kw) ||
          e.tags.toLowerCase().includes(kw)) {
        return { ok: true, title: e.title, content: e.content };
      }
    }
    return { ok: false, title: "", content: "" };
  }

  nosql_category_path(category) {
    return `/data/${category}`;
  }

  // ─────────────────────────────────────────────
  //  TEXT INPUT EMULATION
  //  Real T-Deck shows a modal text input box.
  //  In preview, prompt the user for input.
  // ─────────────────────────────────────────────
  get_text_input(x, y) {
    // Use browser prompt() for preview
    const result = window.prompt("Enter text:", "");
    return result || "";
  }

  // ─────────────────────────────────────────────
  //  GEMINI EMULATION
  //  Real implementation calls generativelanguage.googleapis.com
  //  with the user's API key from secrets.h. In preview, returns
  //  a demo response so the UI can be tested without a key.
  // ─────────────────────────────────────────────
  gemini_has_key() {
    return true;   // Preview always pretends a key is configured
  }

  init_gemini() {
    this.consoleLog("[Gemini] Initialized (preview mock)", "info");
  }

  reset_gemini_memory() {
    this.consoleLog("[Gemini] Memory reset (preview mock)", "info");
  }

  ask_gemini(prompt) {
    this.consoleLog(`[Gemini] Prompt: ${prompt}`, "info");
    // Generate a deterministic demo response
    return "This is a preview response. On real hardware with an API key configured in secrets.h, this app sends the prompt to Google's Gemini API and displays the actual response. The conversation history persists across calls until reset.";
  }

  // ─────────────────────────────────────────────
  //  GPS STATE EMULATION (TinyGPSPlus-compatible)
  //  Returns a slowly walking position around a fixed
  //  origin. Real GPS uses the global gps instance
  //  fed by the background UART task.
  // ─────────────────────────────────────────────
  _gpsState() {
    // Walk around a center point at a few cm/s
    const t = this.millis() / 1000;
    return {
      lat: 34.06713 + Math.sin(t * 0.05) * 0.0002,
      lng: -118.20405 + Math.cos(t * 0.05) * 0.0002,
      altitude_m: 89.0 + Math.sin(t * 0.1) * 1.5,
      satellites: 8 + Math.floor(Math.sin(t * 0.2) * 2),
      hour: new Date().getUTCHours(),
      minute: new Date().getUTCMinutes(),
      second: new Date().getUTCSeconds(),
      valid: true,
    };
  }

  // ─────────────────────────────────────────────
  //  ESP SYSTEM INFO EMULATION
  // ─────────────────────────────────────────────
  ESP_getFreeHeap()  { return 280 * 1024 - Math.floor(Math.random() * 8000); }
  ESP_getHeapSize()  { return 320 * 1024; }
  ESP_getFreePsram() { return 7 * 1024 * 1024 + Math.floor(Math.random() * 100000); }
  ESP_getPsramSize() { return 8 * 1024 * 1024; }
  ESP_getCpuFreqMHz() { return 240; }

  // ─────────────────────────────────────────────
  //  WiFi STATUS EMULATION
  //  Returns WL_CONNECTED constant value (3) so apps
  //  see a connected state for UI testing.
  // ─────────────────────────────────────────────
  WiFi_status()    { return 3; }   // WL_CONNECTED = 3
  WiFi_SSID()      { return "PiscesMoon-Preview"; }
  WiFi_RSSI()      { return -52; }

  // ─────────────────────────────────────────────
  //  D-PAD ABSTRACTION (KodeDot + T-Deck)
  //  On real hardware, get_dpad() reads physical d-pad
  //  on KodeDot or maps trackball state on T-Deck.
  //  Returns {x, y, clicked}. Same API both ways.
  // ─────────────────────────────────────────────
  get_dpad() {
    // Reuse trackball game-speed state — same semantic
    return this.update_trackball_game();
  }

  // ─────────────────────────────────────────────
  //  WiFi SCAN EMULATION
  //  Returns a small set of mock networks so wardrive
  //  templates can be tested without real radio.
  // ─────────────────────────────────────────────
  WiFi_scanNetworks() {
    if (!this._mockNets) {
      this._mockNets = [
        { ssid: "PiscesMoon-AP",  bssid: "AA:BB:CC:00:01:02", enc: 4, ch: 6,  rssi: -42 },
        { ssid: "GuestNet",       bssid: "11:22:33:44:55:66", enc: 0, ch: 1,  rssi: -68 },
        { ssid: "[ESP32] Sniff",  bssid: "DC:EE:FF:11:22:33", enc: 4, ch: 11, rssi: -55 },
        { ssid: "OldRouter",      bssid: "00:1A:2B:3C:4D:5E", enc: 4, ch: 3,  rssi: -80 },
      ];
    }
    return this._mockNets.length;
  }
  WiFi_BSSIDstr(i)        { return (this._mockNets || [])[i]?.bssid || ""; }
  WiFi_SSID_idx(i)        { return (this._mockNets || [])[i]?.ssid  || ""; }
  WiFi_encryptionType(i)  { return (this._mockNets || [])[i]?.enc   || 0; }
  WiFi_channel(i)         { return (this._mockNets || [])[i]?.ch    || 1; }
  WiFi_RSSI_idx(i)        { return (this._mockNets || [])[i]?.rssi  || -100; }
  WiFi_scanDelete()       { /* no-op in preview */ }
  WiFi_mode()             { /* no-op */ }
  WiFi_disconnect()       { /* no-op */ }
  _fmt(fmt, ...args) {
    let i = 0;
    return String(fmt).replace(/%[diuxXfs%]/g, (m) => {
      if (m === "%%") return "%";
      const v = args[i++];
      if (m === "%d" || m === "%i") return Math.floor(v).toString();
      if (m === "%u") return Math.abs(Math.floor(v)).toString();
      if (m === "%x") return Math.floor(v).toString(16);
      if (m === "%X") return Math.floor(v).toString(16).toUpperCase();
      if (m === "%f") return Number(v).toFixed(2);
      if (m === "%s") return String(v);
      return m;
    });
  }

  // ─────────────────────────────────────────────
  //  TRANSPILER — C++ → JS
  //
  //  Turns Pisces Moon C++ idioms into runnable JS.
  //  Strategy: extract the target function body and
  //  rewrite known patterns to JS equivalents.
  // ─────────────────────────────────────────────
  static transpile(cppCode, funcName) {
    // Extract the function body
    const fnRegex = new RegExp(
      `(?:int|void)\\s+(?:elf_main|${funcName})\\s*\\([^)]*\\)\\s*\\{`,
      "m"
    );
    const fnMatch = cppCode.match(fnRegex);
    if (!fnMatch) {
      throw new Error(`Function ${funcName}() not found. Make sure it's declared as 'void ${funcName}()' or 'extern "C" int elf_main(void*)'.`);
    }

    const startIdx = fnMatch.index + fnMatch[0].length;
    let depth = 1, endIdx = startIdx;
    while (endIdx < cppCode.length && depth > 0) {
      const c = cppCode[endIdx];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      endIdx++;
    }
    let body = cppCode.substring(startIdx, endIdx - 1);

    // Strip comments (line + block)
    body = body.replace(/\/\/.*$/gm, "");
    body = body.replace(/\/\*[\s\S]*?\*\//g, "");

    // ── ELF MODULE PATTERN ──
    // ElfContext* ctx = (ElfContext*)ctx_ptr;  → drop entirely (emu is global)
    // Arduino_GFX* gfx = ctx->gfx;             → drop entirely (gfx is implicit)
    // We treat any line that just sets up ctx/gfx aliases as a no-op,
    // since the emulator is `emu` and gfx-> calls already route to emu.
    body = body.replace(/^\s*ElfContext\s*\*\s*\w+\s*=\s*\([^)]+\)\s*\w+\s*;\s*$/gm, "");
    body = body.replace(/^\s*Arduino_GFX\s*\*\s*gfx\s*=\s*\w+\s*->\s*\w+\s*;\s*$/gm, "");

    // Strip C-style pointer casts: (Type*)expr → expr
    body = body.replace(/\(\s*[A-Za-z_]\w*\s*\*\s*\)\s*/g, "");

    // Strip C-style numeric casts: (int)x, (uint32_t)x, (float)x → x
    body = body.replace(
      /\((?:int|float|double|long|short|char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|bool|size_t|unsigned)\)\s*/g,
      ""
    );

    // char buf[N]; → let buf = ""
    // Used by snprintf-style buffers in C++. In JS we use plain strings.
    body = body.replace(/\b(?:int|char|uint8_t|uint16_t|uint32_t)\s+(\w+)\s*\[\s*\d+\s*\]\s*;/g, "let $1 = \"\"");

    // snprintf(buf, len, fmt, ...) → buf = sprintf-equivalent
    // We use a tiny inline format helper
    body = body.replace(
      /\bsnprintf\s*\(\s*(\w+)\s*,\s*[^,]+,\s*([^;]+?)\)\s*;/g,
      "$1 = emu._fmt($2);"
    );

    // sizeof(x) → x.length || 0 (only really used for buffer sizing)
    body = body.replace(/\bsizeof\s*\([^)]+\)/g, "0");

    // Strip C++ types from variable declarations
    body = body.replace(/\b(?:int|float|double|long|short|char|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|bool|size_t|unsigned)\s+(\w+\s*[=;,(\[])/g, "let $1");
    body = body.replace(/\b(?:const|static|extern|volatile)\s+/g, "");
    body = body.replace(/\bString\s+(\w+)/g, "let $1");

    // C++ pointer/reference syntax → JS objects
    // get_touch(&tx, &ty) → { let _t = emu.get_touch(); tx = _t.x; ty = _t.y; _t.ok }
    body = body.replace(
      /get_touch\s*\(\s*&\s*(\w+)\s*,\s*&\s*(\w+)\s*\)/g,
      "(((_t = emu.get_touch()), ($1 = _t.x), ($2 = _t.y), _t.ok))"
    );

    // gfx-> calls
    body = body.replace(/gfx\s*->\s*/g, "emu.");

    // TrackballState tb = update_trackball() → let tb = emu.update_trackball()
    body = body.replace(/TrackballState\s+(\w+)\s*=/g, "let $1 =");
    body = body.replace(/\bupdate_trackball_game\s*\(/g, "emu.update_trackball_game(");
    body = body.replace(/\bupdate_trackball\s*\(/g, "emu.update_trackball(");

    // get_keypress, millis, delay, yield
    body = body.replace(/\bget_keypress\s*\(\)/g, "emu.get_keypress()");
    body = body.replace(/\bmillis\s*\(\)/g, "emu.millis()");
    body = body.replace(/\bdelay\s*\(([^)]+)\)/g, "(yield ['delay', ($1)])");
    body = body.replace(/\byield\s*\(\s*\)\s*;/g, "yield ['frame'];");

    // NFC / RFID
    body = body.replace(/NfcTag\s+(\w+)\s*=\s*nfc_poll\s*\(\)/g, "let $1 = emu.nfc_poll()");
    body = body.replace(/RfidTag\s+(\w+)\s*=\s*rfid_poll\s*\(\)/g, "let $1 = emu.rfid_poll()");
    body = body.replace(/\bnfc_poll\s*\(\)/g, "emu.nfc_poll()");
    body = body.replace(/\brfid_poll\s*\(\)/g, "emu.rfid_poll()");
    body = body.replace(/\bnfc_write\s*\(\s*&\s*(\w+)\s*,\s*([^,]+),\s*([^)]+)\)/g,
                        "emu.nfc_write($1, $2, $3)");

    // Mesh / LoRa
    body = body.replace(/MeshMessage\s+(\w+)\s*=\s*mesh_receive\s*\(\)/g,
                        "let $1 = emu.mesh_receive()");
    body = body.replace(/\bmesh_send\s*\(/g, "emu.mesh_send(");
    body = body.replace(/\bmesh_receive\s*\(\)/g, "emu.mesh_receive()");
    body = body.replace(/\bmesh_node_id\s*\(\)/g, "emu.mesh_node_id()");

    // NoSQL Database
    // nosql_init/save/count/category_path are simple — just route to emu.
    body = body.replace(/\bnosql_init\s*\(/g, "emu.nosql_init(");
    body = body.replace(/\bnosql_save_entry\s*\(/g, "emu.nosql_save_entry(");
    body = body.replace(/\bnosql_get_count\s*\(/g, "emu.nosql_get_count(");
    body = body.replace(/\bnosql_category_path\s*\(/g, "emu.nosql_category_path(");

    // nosql_get_entry(cat, idx, &title, &content) → unpack the returned obj
    body = body.replace(
      /nosql_get_entry\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*&?\s*(\w+)\s*,\s*&?\s*(\w+)\s*\)/g,
      "(((_n = emu.nosql_get_entry($1, $2)), ($3 = _n.title), ($4 = _n.content), _n.ok))"
    );

    // nosql_search(cat, kw, &title, &content) → same pattern
    body = body.replace(
      /nosql_search\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*&?\s*(\w+)\s*,\s*&?\s*(\w+)\s*\)/g,
      "(((_n = emu.nosql_search($1, $2)), ($3 = _n.title), ($4 = _n.content), _n.ok))"
    );

    // get_text_input → prompt-backed
    body = body.replace(/\bget_text_input\s*\(([^)]*)\)/g, "emu.get_text_input($1)");

    // ─────────────────────────────────────────────
    // Gemini API
    // ─────────────────────────────────────────────
    body = body.replace(/\bgemini_has_key\s*\(\)/g, "emu.gemini_has_key()");
    body = body.replace(/\binit_gemini\s*\(\)/g, "emu.init_gemini()");
    body = body.replace(/\breset_gemini_memory\s*\(\)/g, "emu.reset_gemini_memory()");
    body = body.replace(/\bask_gemini\s*\(/g, "emu.ask_gemini(");

    // ─────────────────────────────────────────────
    // GPS — TinyGPSPlus chained accessor methods
    // gps.location.isValid(), gps.location.lat(), gps.location.lng()
    // gps.altitude.isValid(), gps.altitude.meters()
    // gps.satellites.value()
    // gps.time.isValid(), gps.time.hour()/minute()/second()
    // ─────────────────────────────────────────────
    body = body.replace(/\bgps\.location\.isValid\s*\(\)/g,  "emu._gpsState().valid");
    body = body.replace(/\bgps\.location\.lat\s*\(\)/g,      "emu._gpsState().lat");
    body = body.replace(/\bgps\.location\.lng\s*\(\)/g,      "emu._gpsState().lng");
    body = body.replace(/\bgps\.altitude\.isValid\s*\(\)/g,  "emu._gpsState().valid");
    body = body.replace(/\bgps\.altitude\.meters\s*\(\)/g,   "emu._gpsState().altitude_m");
    body = body.replace(/\bgps\.satellites\.value\s*\(\)/g,  "emu._gpsState().satellites");
    body = body.replace(/\bgps\.time\.isValid\s*\(\)/g,      "emu._gpsState().valid");
    body = body.replace(/\bgps\.time\.hour\s*\(\)/g,         "emu._gpsState().hour");
    body = body.replace(/\bgps\.time\.minute\s*\(\)/g,       "emu._gpsState().minute");
    body = body.replace(/\bgps\.time\.second\s*\(\)/g,       "emu._gpsState().second");

    // ─────────────────────────────────────────────
    // WiFi static class methods
    // ─────────────────────────────────────────────
    body = body.replace(/\bWiFi\.status\s*\(\)/g, "emu.WiFi_status()");
    body = body.replace(/\bWiFi\.SSID\s*\(\s*(\d+)\s*\)/g, "emu.WiFi_SSID_idx($1)");
    body = body.replace(/\bWiFi\.SSID\s*\(\s*(\w+)\s*\)/g, "emu.WiFi_SSID_idx($1)");
    body = body.replace(/\bWiFi\.SSID\s*\(\)/g,   "emu.WiFi_SSID()");
    body = body.replace(/\bWiFi\.RSSI\s*\(\s*(\w+)\s*\)/g, "emu.WiFi_RSSI_idx($1)");
    body = body.replace(/\bWiFi\.RSSI\s*\(\)/g,   "emu.WiFi_RSSI()");
    body = body.replace(/\bWiFi\.scanNetworks\s*\([^)]*\)/g, "emu.WiFi_scanNetworks()");
    body = body.replace(/\bWiFi\.BSSIDstr\s*\(([^)]+)\)/g,   "emu.WiFi_BSSIDstr($1)");
    body = body.replace(/\bWiFi\.encryptionType\s*\(([^)]+)\)/g, "emu.WiFi_encryptionType($1)");
    body = body.replace(/\bWiFi\.channel\s*\(([^)]+)\)/g, "emu.WiFi_channel($1)");
    body = body.replace(/\bWiFi\.scanDelete\s*\(\)/g,   "emu.WiFi_scanDelete()");
    body = body.replace(/\bWiFi\.mode\s*\([^)]*\)/g,    "emu.WiFi_mode()");
    body = body.replace(/\bWiFi\.disconnect\s*\([^)]*\)/g, "emu.WiFi_disconnect()");

    // WIFI_AUTH_OPEN constant
    body = body.replace(/\bWIFI_AUTH_OPEN\b/g, "0");
    body = body.replace(/\bWIFI_STA\b/g, "1");

    // D-pad abstraction
    body = body.replace(/DpadState\s+(\w+)\s*=\s*get_dpad\s*\(\)/g, "let $1 = emu.get_dpad()");
    body = body.replace(/\bget_dpad\s*\(\)/g, "emu.get_dpad()");

    // ─────────────────────────────────────────────
    // ELF context — ctx->field becomes stub values so the
    // ELF template preview can run in the browser.
    // The real ElfContext is a C struct passed as void* — not
    // accessible in JS. We emulate just enough to run the demo.
    // ─────────────────────────────────────────────
    // ctx->gfx is already aliased in the template preamble
    body = body.replace(/\bctx->gfx\b/g, "gfx");
    // api_minor — always report 1 in preview (we support v1.1)
    body = body.replace(/\bctx->api_minor\b/g, "1");
    // sd helper function pointers — stub them as null so if (handle >= 0) fails safely
    body = body.replace(/\bctx->sd_open_read\s*\(/g, "(() => -1)(");
    body = body.replace(/\bctx->sd_open_write\s*\(/g, "(() => -1)(");
    body = body.replace(/\bctx->sd_read\s*\(/g, "(() => -1)(");
    body = body.replace(/\bctx->sd_write\s*\(/g, "(() => -1)(");
    body = body.replace(/\bctx->sd_close\s*\(/g, "(() => 0)(");
    body = body.replace(/\bctx->sd_exists\s*\(/g, "(() => false)(");
    body = body.replace(/\bctx->sd_mkdir\s*\(/g, "(() => false)(");
    body = body.replace(/\bctx->sd_remove\s*\(/g, "(() => false)(");
    body = body.replace(/\bctx->sd_size\s*\(/g, "(() => 0)(");
    // ctx->sd_open_read != nullptr → true (exists in v1.1 context)
    body = body.replace(/\bctx->sd_open_read\s*!=\s*nullptr/g, "true");
    // Any remaining ctx-> field access → 0 (safe default)
    body = body.replace(/\bctx->(\w+)\b/g, "0 /*ctx.$1*/");
    // nullptr → null
    body = body.replace(/\bnullptr\b/g, "null");

    // Math helpers commonly used in apps
    body = body.replace(/\bstrncpy\s*\([^;]+\)\s*;/g, ""); // strip strncpy in preview
    body = body.replace(/\bstrcmp\s*\(\s*([^,]+),\s*([^)]+)\)/g, "($1 === $2 ? 0 : 1)");
    body = body.replace(/\bstrlen\s*\(\s*(\w+)\s*\)/g, "($1.length)");
    body = body.replace(/\bstrcpy\s*\([^;]+\)\s*;/g,  "");
    body = body.replace(/\bmemcpy\s*\([^;]+\)\s*;/g,  "");
    body = body.replace(/\bqsort\s*\([^;]+\)\s*;/g,   "");  // no-op in preview

    // BLE API stubs — BLE hardware isn't accessible in browser preview
    body = body.replace(/\bBLEDevice::init\s*\([^)]*\)\s*;/g, "");
    body = body.replace(/\bBLEDevice::getScan\s*\(\)/g, "null");
    body = body.replace(/\b\w+->start\s*\(\d+,\s*(?:false|true)\)/g, "null");
    body = body.replace(/\b\w+->setActiveScan\s*\([^)]*\)\s*;/g, "");
    body = body.replace(/\b\w+->setInterval\s*\([^)]*\)\s*;/g, "");
    body = body.replace(/\b\w+->setWindow\s*\([^)]*\)\s*;/g, "");
    body = body.replace(/\b\w+->clearResults\s*\(\)\s*;/g, "");
    body = body.replace(/\b\w+->getCount\s*\(\)/g, "0");
    body = body.replace(/\bBLEScan\s*\*/g, "let ");
    body = body.replace(/\bBLEScanResults\s*\*/g, "let ");

    // WiFi promiscuous / esp_wifi — strip entirely for preview
    body = body.replace(/\besp_wifi_set_promiscuous\s*\([^)]*\)\s*;/g, "");
    body = body.replace(/\besp_wifi_set_promiscuous_rx_cb\s*\([^)]*\)\s*;/g, "");
    body = body.replace(/\besp_wifi_set_channel\s*\([^)]*\)\s*;/g, "");

    // FreeRTOS mutex extras (ISR variants)
    body = body.replace(/\bxSemaphoreTakeFromISR\s*\([^)]+\)/g, "true");
    body = body.replace(/\bxSemaphoreGiveFromISR\s*\([^)]+\)\s*;/g, "");
    body = body.replace(/\bxSemaphoreCreateMutex\s*\(\s*\)/g, "{}");
    body = body.replace(/\bvSemaphoreDelete\s*\([^)]+\)\s*;/g, "");

    body = body.replace(/\bf\.printf\s*\(/g, "/* f.printf */ (() => 0)(");  // SD writes no-op
    body = body.replace(/\bf\.close\s*\(\)\s*;/g, "");
    body = body.replace(/FsFile\s+f\s*=\s*sd\.open\s*\([^;]+\)\s*;/g, "let f = null;");
    body = body.replace(/\bif\s*\(\s*f\s*\)\s*\{/g, "if (false) {");  // skip the SD block

    // WL_* enum constants
    body = body.replace(/\bWL_CONNECTED\b/g,    "3");
    body = body.replace(/\bWL_DISCONNECTED\b/g, "6");
    body = body.replace(/\bWL_IDLE_STATUS\b/g,  "0");

    // wl_status_t type — strip in declarations
    body = body.replace(/\bwl_status_t\s+(\w+)/g, "let $1");

    // ─────────────────────────────────────────────
    // ESP system info
    // ─────────────────────────────────────────────
    body = body.replace(/\bESP\.getFreeHeap\s*\(\)/g,    "emu.ESP_getFreeHeap()");
    body = body.replace(/\bESP\.getHeapSize\s*\(\)/g,    "emu.ESP_getHeapSize()");
    body = body.replace(/\bESP\.getFreePsram\s*\(\)/g,   "emu.ESP_getFreePsram()");
    body = body.replace(/\bESP\.getPsramSize\s*\(\)/g,   "emu.ESP_getPsramSize()");
    body = body.replace(/\bESP\.getCpuFreqMHz\s*\(\)/g,  "emu.ESP_getCpuFreqMHz()");

    // ─────────────────────────────────────────────
    // SD card emulation — for audio file scan
    // sd.exists(path) / sd.open(path) — return permissive stubs
    // FsFile entry with openNext/getName/isDir/close
    // For preview, return empty result so UI can show "no files"
    // ─────────────────────────────────────────────
    // SemaphoreHandle_t / xSemaphoreTake / xSemaphoreGive — strip the C++ side
    body = body.replace(/extern\s+SemaphoreHandle_t\s+\w+\s*;/g, "");
    body = body.replace(/SemaphoreHandle_t\s+(\w+)/g, "let $1");
    // The mutex calls return truthy values that won't break the JS flow
    body = body.replace(/\bxSemaphoreTake\s*\([^)]+\)/g, "true");
    body = body.replace(/\bxSemaphoreGive\s*\([^)]+\)\s*;/g, "");
    body = body.replace(/\bpdMS_TO_TICKS\s*\([^)]+\)/g, "0");
    body = body.replace(/\bpdTRUE\b/g, "true");

    // Arduino max/min macros — JS Math equivalents
    body = body.replace(/\bmax\s*\(/g, "Math.max(");
    body = body.replace(/\bmin\s*\(/g, "Math.min(");
    body = body.replace(/\babs\s*\(/g, "Math.abs(");

    // String method calls — JS String is pretty similar but charAt is the same
    // .length() in C++ → .length in JS (drop parens)
    body = body.replace(/\.length\s*\(\s*\)/g, ".length");
    // .substring(a, b) is identical in JS
    // .startsWith / .endsWith / .indexOf — same in JS
    // .charAt(i) — same in JS
    // String + char concat in C++ uses overloaded + — JS handles this naturally

    // Color constants
    for (const [name, hex] of Object.entries(PISCES_COLORS)) {
      const re = new RegExp("\\b" + name + "\\b", "g");
      body = body.replace(re, "0x" + hex.toString(16).toUpperCase());
    }

    // String concatenation: "abc" + var → JS-safe
    // (already JS-compatible since we declared everything as let)

    // ELF modules use `return 0;` / `return -1;` — convert to bare `return;`
    body = body.replace(/\breturn\s+-?\d+\s*;/g, "return;");

    // Pre-declare _t for the touch helper, _n for nosql helpers
    body = "let _t, _n;\n" + body;

    return body;
  }

  // ─────────────────────────────────────────────
  //  RUN — execute transpiled code as a generator
  //
  //  The user's code is wrapped in a generator function.
  //  delay() and yield() are turned into yield statements
  //  that hand control back to requestAnimationFrame so
  //  an infinite while(true) loop doesn't lock the page.
  // ─────────────────────────────────────────────
  run(cppCode, funcName) {
    if (this.running) this.stop();

    let body;
    try {
      body = PiscesEmulator.transpile(cppCode, funcName);
    } catch (err) {
      this.consoleLog(`Transpile error: ${err.message}`, "err");
      return false;
    }

    // Wrap in a generator
    let genFn;
    try {
      // eslint-disable-next-line no-new-func
      genFn = new Function("emu", `return (function* userApp() {\n${body}\n})();`);
    } catch (err) {
      this.consoleLog(`Syntax error in transpiled code: ${err.message}`, "err");
      return false;
    }

    let gen;
    try {
      gen = genFn(this);
    } catch (err) {
      this.consoleLog(`Init error: ${err.message}`, "err");
      return false;
    }

    this.running = true;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.fpsLast = performance.now();

    let nextFireTime = 0;
    let stoppedByUser = false;

    const tick = () => {
      if (!this.running) return;

      const now = performance.now();
      this.frameCount++;
      if (now - this.fpsLast >= 1000) {
        this.fpsHook(this.frameCount);
        this.frameCount = 0;
        this.fpsLast = now;
      }

      if (now < nextFireTime) {
        requestAnimationFrame(tick);
        return;
      }

      try {
        let stepCount = 0;
        let result;
        do {
          result = gen.next();
          stepCount++;
          if (result.done) {
            this.consoleLog("App exited cleanly", "info");
            this.running = false;
            return;
          }
          // result.value is what was yielded
          const v = result.value;
          if (Array.isArray(v)) {
            if (v[0] === 'delay') {
              nextFireTime = now + Number(v[1]);
              break;
            }
            if (v[0] === 'frame') {
              break;
            }
          }
          // Hard cap on synchronous execution to prevent freeze
          if (stepCount > 50000) {
            this.consoleLog("Tight loop detected — yielding to UI", "warn");
            break;
          }
        } while (true);
      } catch (err) {
        this.consoleLog(`Runtime error: ${err.message}`, "err");
        this.running = false;
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    this.canvas.focus();
    this.consoleLog(`Running ${funcName}() — click canvas to capture input`, "info");
    return true;
  }

  stop() {
    this.running = false;
    this.consoleLog("Preview stopped", "info");
  }
}
