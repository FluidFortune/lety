# Lety — Pisces Moon IDE

A browser-based development environment for Pisces Moon OS apps and ELF modules.
No installation. Just open `lety.fluidfortune.com` and start coding.

**Live:** https://lety.fluidfortune.com  
**Main OS:** github.com/FluidFortune/PiscesMoon  
**Emulator:** github.com/FluidFortune/emulator  
**License:** AGPL-3.0-or-later

---

## What This Is

A real-time IDE that runs entirely in your browser:

- **Monaco editor** (the editor that powers VS Code) with Pisces Moon API
  autocomplete and C++ syntax highlighting
- **Live preview** — your code runs in a 320×240 emulator window with
  full mouse/keyboard input, identical to the real T-Deck Plus behavior
- **API reference** built in — searchable list of every gfx call,
  trackball state, color constant, timing function
- **Templates** — basic app, menu app, simple game, ELF module
- **Export** — generates the final `.cpp` and a sidecar `integration.txt`
  with exact instructions for `apps.h` and `launcher.cpp`

The same source you write here compiles unchanged for the real T-Deck
via PlatformIO.

---

## How It Works

The IDE runs a **JavaScript transpiler** at preview-time that recognizes
Pisces Moon C++ idioms and converts them to JS for the canvas-based
emulator. The transpilation is invisible to the developer:

```cpp
gfx->fillScreen(C_BLACK);
gfx->setCursor(10, 50);
gfx->print("Hello");
```

becomes (internally, briefly, never seen):

```js
emu.fillScreen(0x0000);
emu.setCursor(10, 50);
emu.print("Hello");
```

You write valid C++. The preview runs it. The exported file goes to
the firmware unchanged.

---

## Hosting

This is a pure static site. Deploy by:

```bash
# GitHub Pages
git push origin main
# Enable Pages in repo settings, point to /

# Any static host (Netlify, Vercel, S3, etc)
# Just upload the files. No build step.
```

Files needed:

```
index.html
ide.css
ide.js
emulator.js
templates.js
api.js
README.md
```

That's it. No `npm install`, no bundler, no build pipeline.

---

## Browser Support

Anything modern: Chrome, Firefox, Safari, Edge.
Monaco loads from a CDN on first run. Subsequent loads are cached.

Mobile works for editing/viewing but the emulator preview needs a
keyboard for trackball/typing. Best on desktop.

---

## What's Supported in Preview

**Display:**
`fillScreen`, `fillRect`, `drawRect`, `drawRoundRect`, `fillRoundRect`,
`drawLine`, `drawFastHLine`, `drawFastVLine`, `drawCircle`, `fillCircle`,
`drawTriangle`, `fillTriangle`, `drawPixel`, `setCursor`, `setTextColor`,
`setTextSize`, `print`, `println`, `printf`

**Input:**
`get_touch(&tx, &ty)`, `update_trackball()`, `update_trackball_game()`,
`get_keypress()`

**Timing:**
`delay(ms)`, `millis()`, `yield()`

**Theme:**
All `C_*` color constants

## What's Not in Preview

These compile and run on real hardware but are stubbed in the browser:

- WiFi, BLE, LoRa, GPS
- SD card I/O (writes to a virtual buffer; reads return empty)
- Audio
- Custom external libraries

Apps that depend on these will preview the UI but the hardware-dependent
parts will no-op. The exported `.cpp` will work correctly on real hardware.

---

## Controls

```
Mouse click + drag       →  Touchscreen
Arrow keys ↑ ↓ ← →       →  Trackball
Right-Alt + Enter        →  Trackball click
All other keys           →  T-Deck QWERTY
```

Click the canvas first to give it keyboard focus.

---

## Contributing

Pull requests welcome. By submitting one you agree to the CLA in the
main Pisces Moon repository.

---

*Pisces Moon OS · Copyright (C) 2026 Eric Becker / Fluid Fortune · fluidfortune.com*  
*AGPL-3.0-or-later*
