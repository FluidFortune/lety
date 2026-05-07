# Lety — Pisces Moon IDE

> *Dedicated to Lety: An absolute force of nature.*

Browser-based development for Pisces Moon OS.  
**Write code → click ⚡ Build & Flash → app runs on your T-Deck.**

**Live:** https://lety.fluidfortune.com  
**Main OS:** github.com/FluidFortune/PiscesMoon  
**SDL2 Emulator:** github.com/FluidFortune/emulator  
**License:** AGPL-3.0-or-later

---

## What You Get

- **Monaco editor** with Pisces Moon API autocomplete and C++ highlighting
- **Live preview** — code runs in a 320×240 emulator window in your browser
- **Cloud build** — backend runs PlatformIO, returns a real `.bin`
- **Web Serial flash** — flashes directly to your T-Deck without leaving Chrome
- **15 templates** covering every category (TOOLS, GAMES, COMMS, CYBER, INTEL, MEDIA, SYSTEM, ELF)
- **Full API reference** searchable in the sidebar
- **Export** — generates clean source files for traditional development

---

## I'm New to ESP32 / Embedded — What Are All These File Types?

Pisces Moon code is C++ that runs on the ESP32-S3 microcontroller inside the T-Deck Plus. If you've only worked with web or scripting languages, the file ecosystem can be confusing. Here's the map:

### `.cpp` files — your code

These contain the actual logic of your app. Functions, variables, what to draw, how to respond to input. When you write a Pisces Moon app, this is where you spend most of your time.

```cpp
// my_app.cpp
void run_my_app() {
    gfx->fillScreen(C_BLACK);
    gfx->print("Hello");
}
```

### `.h` files — declarations and shared interfaces

Header files describe *what* something is without showing *how* it works. They let other code in the project know your function exists. When you create a built-in app, you add a one-line declaration to `apps.h` so the launcher knows it can call your function.

```cpp
// apps.h
void run_my_app();   // Declaration — implemented in my_app.cpp
```

You include headers with `#include "filename.h"` at the top of your `.cpp` file. This is how your code gets access to the GFX library, the touch system, and so on.

### `.elf` files — compiled, loadable modules

ELF stands for "Executable and Linkable Format." It's the compiled output of your C++ code in a format the OS can load *at runtime*, without rebuilding the firmware. Pisces Moon supports ELF modules — drop a `.elf` and a `.json` manifest into `/sd/apps/` and the system loads it on demand.

This is the best way to ship a single app to existing Pisces Moon users. They keep their firmware, just add your file.

```
my_module.elf   ← compiled binary, ~10-50 KB typical
my_module.json  ← manifest: name, category, version, PSRAM size
```

### `.bin` files — the firmware

This is the entire compiled OS as a single binary. Flashing this replaces everything on the chip — Pisces Moon, your apps, settings, all of it. You only deal with `.bin` files when initially installing Pisces Moon or reflashing the whole system.

### `platformio.ini` — the build configuration

This file tells PlatformIO how to compile your project. What chip, what libraries, what compiler flags. Pisces Moon ships with one already configured. You typically don't edit it unless adding a new library dependency.

```ini
[env:esp32s3]
platform = espressif32
board    = esp32-s3-devkitc-1
framework = arduino
lib_deps  = ...
```

---

## What is PlatformIO?

PlatformIO is the build system that turns your `.cpp` source files into a `.bin` firmware file. Think of it like `npm`/`pip`/`cargo` for embedded devices.

It does three jobs:
1. **Manages libraries** — pulls in dependencies (Arduino_GFX, SdFat, TinyGPSPlus, etc.) automatically
2. **Compiles** — invokes the ESP32 cross-compiler (xtensa-esp32s3-elf-g++)
3. **Flashes** — writes the result to your T-Deck via USB

For Lety users using **⚡ Build & Flash**, PlatformIO runs on the cloud server. You never install it locally.

For developers who want to compile **on their own machine**:
1. Install [VS Code](https://code.visualstudio.com)
2. Install the PlatformIO extension from the VS Code Extensions tab
3. Clone the Pisces Moon repo
4. Open it in VS Code → bottom toolbar → click "Build" then "Upload"

That's the entire toolchain. PlatformIO downloads the ESP32 compiler automatically the first time.

---

## How an App Gets Wired Into Pisces Moon

There are two ways to ship an app:

### As a built-in app (compiled into the OS)

Best for: core apps you want everyone to have, apps that need deep system access.

Three files get touched:

```
src/my_app.cpp        ← Your code
include/apps.h        ← One-line declaration
src/launcher.cpp      ← Three small additions
```

**`include/apps.h`** — add the function declaration:
```cpp
void run_my_app();
```

**`src/launcher.cpp`** — add the app ID, menu entry, and dispatch case:
```cpp
#define APP_MY_APP   99   // Pick the next free number

// In the SYSTEM (or other) category array:
{"MY APP", APP_MY_APP},

// In launchApp() switch:
case APP_MY_APP: run_my_app(); break;
```

Lety's **Export** button generates an `integration.txt` with the exact lines to add, so you don't have to memorize this. See `example_launcher.cpp` in this repo for a full annotated example.

### As an ELF module (loaded from SD card)

Best for: third-party apps, things you don't want bundled into the firmware, anything users install themselves.

One file gets dropped on the SD card:

```
/sd/apps/my_module.elf    ← The compiled binary
/sd/apps/my_module.json   ← Manifest with metadata
```

The user launches it via SYSTEM → ELF APPS → My Module. No firmware reflash.

The function signature is different:
```cpp
extern "C" int elf_main(void* ctx_ptr) {
    ElfContext* ctx = (ElfContext*)ctx_ptr;
    Arduino_GFX* gfx = ctx->gfx;
    // ... your code ...
    return 0;
}
```

---

## How Lety's Live Preview Works

The preview window in your browser **is not** running the same compiled code that ends up on the device. It's running a JavaScript translation of your C++ that interprets the Pisces Moon API calls.

This means:
- ✅ The visual output, layout, and interaction flow match the device exactly
- ✅ Touch, trackball/D-pad, keyboard input work like the real thing
- ✅ Most apps preview correctly without modification
- ⚠️ Hardware-specific features (WiFi scan, BLE, LoRa TX, audio I2S, real SD I/O) are stubbed in preview — they show mock data
- ⚠️ Complex C++ that doesn't match Pisces Moon idioms (heavy templates, struct definitions, function pointers) may not preview, but **will still compile fine for hardware via Build & Flash**

The preview is a development aid. The real test is running on the device.

---

## Templates Included

| Template | Category | Hardware | What it shows |
|---|---|---|---|
| Basic App | TOOLS | Both | Header, exit, trackball, keyboard — the universal pattern |
| Menu App | TOOLS | Both | Vertical selection menu |
| Simple Game | GAMES | Both | Game loop with movable cursor, fast trackball |
| NFC Reader | CYBER | Both | Polls NFC tags, shows UID + NDEF text |
| **Wardriver** | **CYBER** | **Both** | WiFi+GPS scan, CSV logging, full SPI Bus Treaty |
| **BLE Scanner** | **CYBER** | **Both** | Passive BLE advertiser discovery, RSSI-sorted list |
| **Probe Intel** | **CYBER** | **Both** | 802.11 probe request sniffer, device presence mapping |
| Mesh Messenger | COMMS | Both | LoRa mesh chat with broadcast send |
| GPS Position | COMMS | Both | Live lat/lng/altitude/satellites display |
| **KodeDot BLE** | **CYBER** | **Both** | Dual-hardware BLE scanner: 480×480 + 320×240 layout, D-pad nav |
| NoSQL Database | INTEL | Both | Document store with list/detail/new |
| AI / Gemini | INTEL | Both | Prompt → AI response, graceful no-key fallback |
| Audio Player | MEDIA | Both | SD file scan, play/stop UI |
| System Info | SYSTEM | Both | Free heap/PSRAM, WiFi state, uptime |
| ELF Module | (any) | Both | Standalone .elf with elf_main entry point |

---

## Hardware Support

| Device | Status | Input |
|---|---|---|
| LilyGO T-Deck Plus | Production | Trackball + QWERTY + Touch |
| KodeDot | Theoretical | D-pad + Buttons + Touch |

Use templates with `update_trackball()` for T-Deck-specific apps. Use `get_dpad()` for portable apps that work on both. Lety's preview emulates trackball behavior; KodeDot's native d-pad maps to the same `{x, y, clicked}` structure on real hardware.

---


---

## Key Libraries — What They Do

Pisces Moon pulls in these libraries via PlatformIO. When you see `#include` at the top of a template, here's what you're getting:

| Library | Header | What it provides |
|---|---|---|
| Arduino_GFX | `Arduino_GFX_Library.h` | Display driver — `gfx->fillScreen()`, `gfx->print()`, all drawing primitives |
| SdFat | `SdFat.h` | SD card filesystem — fast FAT32/exFAT, FreeRTOS-safe with mutex |
| TinyGPSPlus | `TinyGPSPlus.h` | NMEA GPS parser — `gps.location.lat()`, `gps.satellites.value()` etc |
| ESP32 BLE | `BLEDevice.h`, `BLEScan.h` | Bluetooth LE stack — scanning, GATT client, advertising |
| RadioLib | Used internally | LoRa SX1262 driver — LoRa TX/RX, frequency, spreading factor |
| ArduinoJson | Used internally | JSON serialization — ELF manifests, NoSQL documents |
| Audio | `Audio.h` | I2S audio streaming — MP3/WAV from SD to DAC |
| FreeRTOS | `freertos/semphr.h` | RTOS primitives — mutexes, tasks, queues. Comes with ESP32 Arduino |
| esp_wifi | `esp_wifi.h` | Low-level WiFi — promiscuous mode for packet sniffing |

You don't install these manually. PlatformIO reads `lib_deps` in `platformio.ini` and fetches them automatically the first time you build.

### The ones Pisces Moon adds itself

These headers are part of Pisces Moon, not external libraries:

| Header | What it provides |
|---|---|
| `theme.h` | Color constants: `C_GREEN`, `C_RED`, `C_CYAN`, `C_DARK` etc |
| `touch.h` | `get_touch(&tx, &ty)` — GT911 capacitive touchscreen |
| `trackball.h` | `update_trackball()` → `TrackballState {x, y, clicked}` |
| `dpad.h` | `get_dpad()` → `DpadState {x, y, clicked}` — unified T-Deck+KodeDot input |
| `keyboard.h` | `get_keypress()` → char — T-Deck QWERTY keyboard |
| `gemini_client.h` | `ask_gemini(prompt)`, `gemini_has_key()` — Gemini AI API |
| `nosql_store.h` | `nosql_save_entry()`, `nosql_get_entry()` — SD-backed document store |
| `elf_loader.h` | ELF context struct, `ctx->sd_open_read()` helpers for ELF modules |
| `text_buffer.h` | PSRAM-backed scrollback buffer for terminal-style apps |

---

## KodeDot Portability Notes

KodeDot ships with a 480×480 AMOLED display versus the T-Deck's 320×240. Apps that hardcode pixel positions won't look right on one of the two devices.

**The right approach:**

```cpp
// At the top of your app, or in a shared header:
// These resolve at compile time based on the target board.
// T-Deck:  SCREEN_W=320, SCREEN_H=240
// KodeDot: SCREEN_W=480, SCREEN_H=480

int center_x = SCREEN_W / 2;
int center_y = SCREEN_H / 2;
int row_max  = (SCREEN_H - 49) / 18;   // header=24 + footer=25

// Adapt text density to available space:
int max_name_chars = (SCREEN_W > 400) ? 30 : 18;
```

**Input:** `get_dpad()` returns `DpadState {x, y, clicked}` on both devices. On T-Deck it maps trackball motion. On KodeDot it reads the native d-pad. Apps that use `get_dpad()` instead of `update_trackball()` compile and behave correctly on both without any `#ifdef`.

**The KodeDot BLE Scanner template** demonstrates both patterns end-to-end.

---

## SPI Bus Treaty — Why It Matters

The T-Deck Plus shares one SPI bus between the SD card, LoRa radio, and display. If two parts of the system try to use it simultaneously, you get random reboots. Pisces Moon enforces a "treaty" — every operation that touches SD or LoRa takes a global mutex first.

For your apps:

```cpp
extern SemaphoreHandle_t spi_mutex;

if (xSemaphoreTake(spi_mutex, pdMS_TO_TICKS(500)) == pdTRUE) {
    FsFile f = sd.open("/my_data.txt", O_WRITE | O_CREAT);
    if (f) {
        f.print("hello");
        f.close();
    }
    xSemaphoreGive(spi_mutex);
}
```

The `nosql_*` functions handle this internally — apps using them don't need to take the mutex themselves. WiFi scanning is special: never hold the mutex during the scan itself, only during the SD write of results.

This pattern shows up in the **Wardriver** template — study it if you're building anything that combines radio + SD.

---

## Browser Requirements

For preview only: any modern browser.

For ⚡ Build & Flash: **Chrome, Edge, or Opera on desktop**. Web Serial isn't supported in Firefox or Safari. Mobile browsers don't support it either.

---

## Hosting

Pure static site. Deploy on GitHub Pages, Cloudflare Pages, Netlify, Vercel, S3 — anywhere static.

Files in this repo:
```
index.html, ide.css, ide.js   ← UI shell
emulator.js                    ← C++ → JS preview engine  
build.js                       ← Cloud compile + Web Serial flash
api.js, templates.js           ← API reference + starter code
example_launcher.cpp           ← Reference for built-in app integration
README.md, CLA.md              ← Documentation
CNAME                          ← Custom domain
backend/                       ← Cloud compile service (separate deploy)
```

The cloud compile backend is a separate deployment — see `backend/README.md`.

---

## Cost

Frontend: free on GitHub Pages.

Backend (only needed for ⚡ Build & Flash): $0-5/month depending on traffic.
- 100 builds/day: $0/mo on Fly.io free tier
- 1,000 builds/day: ~$3/mo
- See `backend/README.md` for full sizing guide

---

## Contributing

Pull requests welcome. By submitting one you agree to the CLA in `CLA.md`.

---

*Pisces Moon OS · Lety v3.0 · Copyright (C) 2026 Eric Becker / Fluid Fortune · fluidfortune.com*  
*AGPL-3.0-or-later*
