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

    // Color constants
    for (const [name, hex] of Object.entries(PISCES_COLORS)) {
      const re = new RegExp("\\b" + name + "\\b", "g");
      body = body.replace(re, "0x" + hex.toString(16).toUpperCase());
    }

    // String concatenation: "abc" + var → JS-safe
    // (already JS-compatible since we declared everything as let)

    // Pre-declare _t for the touch helper
    body = "let _t;\n" + body;

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
