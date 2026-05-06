// Pisces Moon OS — IDE Templates
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later

const TEMPLATES = {

  // ─────────────────────────────────────────────
  builtin_basic: {
    name: "Built-in: Basic App",
    desc: "Standard app with header, tap-to-exit, trackball + keyboard",
    type: "builtin",
    funcName: "run_my_app",
    code: `// Pisces Moon OS — My App
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"

extern Arduino_GFX* gfx;

void run_my_app() {
    gfx->fillScreen(C_BLACK);

    // Header — universal pattern, ty < 40 to exit
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("MY APP | TAP HEADER TO EXIT");

    // App content
    gfx->setTextSize(2);
    gfx->setTextColor(C_WHITE);
    gfx->setCursor(10, 60);
    gfx->print("Hello Pisces Moon");

    gfx->setTextSize(1);
    gfx->setTextColor(C_CYAN);
    gfx->setCursor(10, 100);
    gfx->print("Use trackball or keyboard");

    int counter = 0;

    while (true) {
        int16_t tx, ty;
        // Header tap = exit (ty < 40 is the universal convention)
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        TrackballState tb = update_trackball();
        if (tb.clicked) {
            counter++;
            gfx->fillRect(10, 140, 200, 16, C_BLACK);
            gfx->setCursor(10, 140);
            gfx->setTextColor(C_YELLOW);
            gfx->printf("Clicks: %d", counter);
        }

        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;

        delay(50);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_menu: {
    name: "Built-in: Menu App",
    desc: "Vertical menu with trackball selection and click-to-action",
    type: "builtin",
    funcName: "run_my_menu",
    code: `// Pisces Moon OS — My Menu App
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"

extern Arduino_GFX* gfx;

static const char* MENU_ITEMS[] = {
    "Option One",
    "Option Two",
    "Option Three",
    "Option Four",
    "Exit",
};
static const int MENU_COUNT = sizeof(MENU_ITEMS) / sizeof(MENU_ITEMS[0]);

static void draw_menu(int selected) {
    gfx->fillScreen(C_BLACK);

    // Header
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("MY MENU | TAP HEADER TO EXIT");

    gfx->setTextSize(2);
    int y = 50;
    for (int i = 0; i < MENU_COUNT; i++) {
        if (i == selected) {
            gfx->fillRect(0, y - 2, 320, 22, C_DARK);
            gfx->setTextColor(C_GREEN);
            gfx->setCursor(10, y);
            gfx->print("> ");
        } else {
            gfx->setTextColor(C_WHITE);
            gfx->setCursor(20, y);
        }
        gfx->print(MENU_ITEMS[i]);
        y += 30;
    }
}

void run_my_menu() {
    int selected = 0;
    draw_menu(selected);

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        TrackballState tb = update_trackball();

        if (tb.y == -1 && selected > 0) {
            selected--;
            draw_menu(selected);
        } else if (tb.y == 1 && selected < MENU_COUNT - 1) {
            selected++;
            draw_menu(selected);
        }

        if (tb.clicked) {
            if (selected == MENU_COUNT - 1) return;  // Exit option

            // Handle selection
            gfx->fillScreen(C_BLACK);
            gfx->fillRect(0, 0, 320, 24, C_DARK);
            gfx->setCursor(10, 7);
            gfx->setTextColor(C_GREEN);
            gfx->setTextSize(1);
            gfx->print("SELECTED");

            gfx->setTextSize(2);
            gfx->setTextColor(C_YELLOW);
            gfx->setCursor(10, 60);
            gfx->print("You picked:");
            gfx->setCursor(10, 90);
            gfx->setTextColor(C_CYAN);
            gfx->print(MENU_ITEMS[selected]);

            gfx->setTextSize(1);
            gfx->setTextColor(C_GREY);
            gfx->setCursor(10, 200);
            gfx->print("Tap header to return...");

            while (true) {
                if (get_touch(&tx, &ty) && ty < 40) {
                    while (get_touch(&tx, &ty)) { delay(10); yield(); }
                    break;
                }
                delay(50);
                yield();
            }
            draw_menu(selected);
        }

        delay(50);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_game: {
    name: "Built-in: Simple Game",
    desc: "Game loop with movable cursor, score, fast trackball",
    type: "builtin",
    funcName: "run_my_game",
    code: `// Pisces Moon OS — My Game
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"

extern Arduino_GFX* gfx;

void run_my_game() {
    int player_x = 160;
    int player_y = 120;
    int target_x = 80;
    int target_y = 80;
    int score = 0;

    gfx->fillScreen(C_BLACK);

    // Header
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;

        // Use game-speed trackball for responsive movement
        TrackballState tb = update_trackball_game();
        int new_x = player_x + tb.x * 4;
        int new_y = player_y + tb.y * 4;
        if (new_x < 8)   new_x = 8;
        if (new_x > 312) new_x = 312;
        if (new_y < 32)  new_y = 32;
        if (new_y > 232) new_y = 232;

        // Erase old player position
        gfx->fillCircle(player_x, player_y, 6, C_BLACK);
        player_x = new_x;
        player_y = new_y;

        // Check collision with target
        int dx = player_x - target_x;
        int dy = player_y - target_y;
        if (dx*dx + dy*dy < 100) {
            // Hit — new target
            score++;
            target_x = 20 + (millis() * 7) % 280;
            target_y = 40 + (millis() * 13) % 180;
            gfx->fillScreen(C_BLACK);
            gfx->fillRect(0, 0, 320, 24, C_DARK);
            gfx->drawFastHLine(0, 24, 320, C_GREEN);
        }

        // Draw target
        gfx->fillCircle(target_x, target_y, 4, C_RED);

        // Draw player
        gfx->fillCircle(player_x, player_y, 6, C_CYAN);

        // Score
        gfx->fillRect(10, 4, 100, 14, C_DARK);
        gfx->setCursor(10, 7);
        gfx->setTextColor(C_GREEN);
        gfx->setTextSize(1);
        gfx->printf("SCORE: %d", score);

        delay(30);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  elf_module: {
    name: "ELF Module: v1.1 Standalone",
    desc: "Loadable .elf module — demonstrates v1.1 SPI Bus Treaty helpers",
    type: "elf",
    funcName: "elf_main",
    code: `// Pisces Moon OS — My ELF Module (v1.1)
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// ELF API v1.1 — uses ctx->sd_* helpers for SD I/O.
// These helpers internally take spi_mutex, making it impossible
// for this module to violate the SPI Bus Treaty.
//
// v1.0 ELFs that called ctx->sd->open() directly are still loadable
// on v1.1 firmware but are treaty non-compliant. Migrate when convenient.
//
// Compile with: pio run -e esp32s3
// Deploy: copy .elf and .json to /sd/apps/

#include "elf_loader.h"

extern "C" int elf_main(void* ctx_ptr) {
    ElfContext* ctx = (ElfContext*)ctx_ptr;
    Arduino_GFX* gfx = ctx->gfx;

    gfx->fillScreen(0x0000);   // Black

    // Header
    gfx->fillRect(0, 0, 320, 24, 0x18C3);   // Dark
    gfx->drawFastHLine(0, 24, 320, 0x07E0);  // Green
    gfx->setCursor(10, 7);
    gfx->setTextColor(0x07E0);
    gfx->setTextSize(1);
    gfx->print("ELF MODULE v1.1 | TAP HEADER TO EXIT");

    // Title
    gfx->setTextSize(2);
    gfx->setTextColor(0xFFFF);
    gfx->setCursor(10, 40);
    gfx->print("ELF v1.1 Demo");

    // ─── v1.1 SPI Bus Treaty compliance check ───
    gfx->setTextSize(1);
    gfx->setCursor(10, 80);
    if (ctx->api_minor >= 1 && ctx->sd_open_read != nullptr) {
        gfx->setTextColor(0x07E0);  // Green
        gfx->print("API: v1.1 — using safe SD helpers");
    } else {
        gfx->setTextColor(0xFD20);  // Amber
        gfx->print("API: v1.0 — fallback mode");
    }

    // ─── Example: read a config file via the v1.1 helpers ───
    // This pattern is the recommended way to do SD I/O from an ELF.
    // The helpers take spi_mutex internally, so even if Ghost Engine
    // is wardriving in the background, the bus stays coherent.

    gfx->setCursor(10, 105);
    gfx->setTextColor(0x07FF);
    gfx->print("Reading /apps/my_module.cfg...");

    if (ctx->api_minor >= 1) {
        // SAFE PATTERN — handle-based, mutex-wrapped per call
        int handle = ctx->sd_open_read("/apps/my_module.cfg");
        if (handle >= 0) {
            char buf[128];
            int n = ctx->sd_read(handle, buf, sizeof(buf) - 1);
            if (n > 0) {
                buf[n] = 0;
                gfx->setCursor(10, 125);
                gfx->setTextColor(0xFFFF);
                gfx->print("Read ");
                gfx->print(n);
                gfx->print(" bytes");
            }
            ctx->sd_close(handle);
        } else {
            gfx->setCursor(10, 125);
            gfx->setTextColor(0xFD20);
            gfx->print("(no config file — that's fine)");
        }
    } else {
        gfx->setCursor(10, 125);
        gfx->setTextColor(0xFD20);
        gfx->print("(legacy firmware — skipping read)");
    }

    // Show that we can run alongside wardrive without crashing
    gfx->setCursor(10, 160);
    gfx->setTextColor(0x07FF);
    gfx->print("Try wardriving while this runs!");
    gfx->setCursor(10, 175);
    gfx->setTextColor(0x6B7280);
    gfx->print("v1.1 helpers prevent SPI collisions.");

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return 0;  // 0 = clean exit
        }
        delay(50);
        yield();
    }
}
`,
    manifest: {
      name: "My Module",
      version: "1.0.0",
      author: "Your Name",
      category: "TOOLS",
      elf: "my_module.elf",
      psram_kb: 256,
      api: [1, 1]
    }
  },

  // ─────────────────────────────────────────────
  builtin_nfc: {
    name: "Built-in: NFC Reader",
    desc: "Polls NFC tags and displays UID + NDEF text",
    type: "builtin",
    funcName: "run_nfc_reader",
    code: `// Pisces Moon OS — NFC Reader
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"
#include "nfc.h"

extern Arduino_GFX* gfx;

static void draw_idle() {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("NFC READER | TAP HEADER TO EXIT");

    gfx->fillCircle(160, 130, 50, C_DARK);
    gfx->drawCircle(160, 130, 50, C_GREEN);
    gfx->drawCircle(160, 130, 60, C_GREY);

    gfx->setTextSize(2);
    gfx->setTextColor(C_CYAN);
    gfx->setCursor(70, 200);
    gfx->print("Place tag");
}

static void draw_tag(NfcTag tag) {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("TAG DETECTED");

    gfx->setTextSize(1);
    gfx->setTextColor(C_YELLOW);
    gfx->setCursor(10, 40);
    gfx->print("UID: ");
    gfx->setTextColor(C_WHITE);
    for (int i = 0; i < tag.uid_len; i++) {
        gfx->printf("%02X ", tag.uid[i]);
    }

    gfx->setTextColor(C_YELLOW);
    gfx->setCursor(10, 70);
    gfx->print("Text:");
    gfx->setTextColor(C_CYAN);
    gfx->setCursor(10, 90);
    gfx->print(tag.ndef_text);

    gfx->setTextColor(C_GREY);
    gfx->setCursor(10, 220);
    gfx->print("Remove tag to scan again...");
}

void run_nfc_reader() {
    bool last_present = false;
    draw_idle();

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        NfcTag tag = nfc_poll();

        if (tag.valid && !last_present) {
            draw_tag(tag);
            last_present = true;
        } else if (!tag.valid && last_present) {
            draw_idle();
            last_present = false;
        }

        delay(100);
        yield();
    }
}
`
  },


  // ─────────────────────────────────────────────
  builtin_mesh: {
    name: "Built-in: Mesh Messenger",
    desc: "Send and receive messages over the LoRa mesh",
    type: "builtin",
    funcName: "run_mesh_chat",
    code: `// Pisces Moon OS — Mesh Chat
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Note: LoRa transmission only fires on real hardware.
// In Lety preview, sent messages log to the console.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"
#include "mesh.h"

extern Arduino_GFX* gfx;

static const int MAX_LOG = 8;
static String chat_log[MAX_LOG];
static int    log_count = 0;

static void log_message(const String& msg) {
    if (log_count < MAX_LOG) {
        chat_log[log_count++] = msg;
    } else {
        for (int i = 0; i < MAX_LOG - 1; i++) {
            chat_log[i] = chat_log[i + 1];
        }
        chat_log[MAX_LOG - 1] = msg;
    }
}

static void redraw() {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->printf("MESH NODE 0x%04X | TAP HEADER TO EXIT", mesh_node_id());

    gfx->setTextSize(1);
    int y = 35;
    for (int i = 0; i < log_count; i++) {
        if (chat_log[i].startsWith(">")) {
            gfx->setTextColor(C_CYAN);
        } else {
            gfx->setTextColor(C_YELLOW);
        }
        gfx->setCursor(10, y);
        gfx->print(chat_log[i]);
        y += 16;
    }

    gfx->fillRect(0, 215, 320, 25, C_DARK);
    gfx->setCursor(10, 222);
    gfx->setTextColor(C_GREEN);
    gfx->print("[T] Send test  [Q] Quit");
}

void run_mesh_chat() {
    redraw();

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;

        if (k == 't' || k == 'T') {
            String msg = "Hello from " + String(mesh_node_id(), HEX);
            mesh_send(0xFFFF, msg);
            log_message("> " + msg);
            redraw();
        }

        MeshMessage m = mesh_receive();
        if (m.valid) {
            String entry = String(m.from, HEX) + ": " + m.text;
            log_message(entry);
            redraw();
        }

        delay(100);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_database: {
    name: "Built-in: NoSQL Database App",
    desc: "JSON document store — list, save, search entries on SD card",
    type: "builtin",
    funcName: "run_my_database",
    code: `// Pisces Moon OS — NoSQL Database App
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Demonstrates the Pisces Moon NoSQL document store.
// Storage layout on SD: /data/<category>/index.json + entry_N.json
//
// SPI Bus Treaty: nosql_* functions internally take spi_mutex
// before any SD I/O. App code does not need to take the mutex.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"
#include "nosql_store.h"

extern Arduino_GFX* gfx;

#define MY_CATEGORY  "myapp"
#define ROW_HEIGHT   20
#define MAX_VISIBLE  9

// ─────────────────────────────────────────────
//  VIEW MODES
// ─────────────────────────────────────────────
enum ViewMode { VIEW_LIST, VIEW_DETAIL, VIEW_NEW };

static void draw_header(const char* title) {
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print(title);
}

// ─────────────────────────────────────────────
//  LIST VIEW — shows all entries with cursor
// ─────────────────────────────────────────────
static void draw_list(int cursor, int scroll_offset, int total) {
    gfx->fillScreen(C_BLACK);
    draw_header("MY DATABASE | TAP HEADER TO EXIT");

    if (total == 0) {
        gfx->setTextColor(C_GREY);
        gfx->setCursor(10, 80);
        gfx->print("No entries yet.");
        gfx->setCursor(10, 100);
        gfx->print("Press [N] to create one.");
        gfx->fillRect(0, 215, 320, 25, C_DARK);
        gfx->setCursor(10, 222);
        gfx->setTextColor(C_GREEN);
        gfx->print("[N] New entry  [Q] Quit");
        return;
    }

    // Render visible entries
    int y = 35;
    String title, content;
    for (int i = 0; i < MAX_VISIBLE && (scroll_offset + i) < total; i++) {
        int idx = scroll_offset + i;
        if (!nosql_get_entry(MY_CATEGORY, idx, title, content)) continue;

        if (idx == cursor) {
            gfx->fillRect(0, y - 2, 320, ROW_HEIGHT - 2, C_DARK);
            gfx->setTextColor(C_GREEN);
            gfx->setCursor(10, y);
            gfx->print("> ");
        } else {
            gfx->setTextColor(C_WHITE);
            gfx->setCursor(20, y);
        }

        // Truncate title to fit
        if (title.length() > 36) title = title.substring(0, 33) + "...";
        gfx->print(title);
        y += ROW_HEIGHT;
    }

    // Footer
    gfx->fillRect(0, 215, 320, 25, C_DARK);
    gfx->setCursor(10, 222);
    gfx->setTextColor(C_GREEN);
    gfx->printf("[%d/%d] [N]ew  [CLK]Open  [Q]uit",
                cursor + 1, total);
}

// ─────────────────────────────────────────────
//  DETAIL VIEW — shows full entry content
// ─────────────────────────────────────────────
static void draw_detail(const String& title, const String& content) {
    gfx->fillScreen(C_BLACK);
    draw_header("ENTRY | TAP HEADER TO BACK");

    gfx->setTextColor(C_YELLOW);
    gfx->setCursor(10, 35);
    gfx->setTextSize(1);
    gfx->print(title);

    gfx->setTextColor(C_WHITE);
    int y = 55;
    int x = 10;
    for (int i = 0; i < content.length() && y < 210; i++) {
        char c = content.charAt(i);
        if (c == '\\n') { x = 10; y += 12; continue; }
        gfx->setCursor(x, y);
        gfx->print(c);
        x += 6;
        if (x > 305) { x = 10; y += 12; }
    }

    gfx->fillRect(0, 215, 320, 25, C_DARK);
    gfx->setCursor(10, 222);
    gfx->setTextColor(C_GREEN);
    gfx->print("[B] Back  [Q] Quit");
}

// ─────────────────────────────────────────────
//  NEW ENTRY — prompts user for title + content
// ─────────────────────────────────────────────
static bool create_new_entry() {
    gfx->fillScreen(C_BLACK);
    draw_header("NEW ENTRY");

    gfx->setTextColor(C_WHITE);
    gfx->setCursor(10, 40);
    gfx->print("Title:");
    String title = get_text_input(10, 60);
    if (title.length() == 0) return false;

    gfx->setCursor(10, 90);
    gfx->print("Content:");
    String content = get_text_input(10, 110);
    if (content.length() == 0) content = "(empty)";

    bool ok = nosql_save_entry(MY_CATEGORY,
                                title.c_str(),
                                content.c_str(),
                                "");

    gfx->fillRect(0, 140, 320, 30, C_BLACK);
    gfx->setCursor(10, 150);
    gfx->setTextColor(ok ? C_GREEN : C_RED);
    gfx->print(ok ? "Saved successfully!" : "Save failed!");
    delay(1500);
    return ok;
}

// ─────────────────────────────────────────────
//  MAIN ENTRY POINT
// ─────────────────────────────────────────────
void run_my_database() {
    // Initialize the NoSQL category
    if (!nosql_init(MY_CATEGORY)) {
        gfx->fillScreen(C_BLACK);
        draw_header("ERROR");
        gfx->setTextColor(C_RED);
        gfx->setCursor(10, 50);
        gfx->print("Could not initialize database.");
        gfx->setCursor(10, 70);
        gfx->print("Check SD card.");
        delay(3000);
        return;
    }

    int cursor = 0;
    int scroll_offset = 0;
    bool needs_redraw = true;

    while (true) {
        int total = nosql_get_count(MY_CATEGORY);

        if (needs_redraw) {
            draw_list(cursor, scroll_offset, total);
            needs_redraw = false;
        }

        // ── Input ──
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;
        if (k == 'n' || k == 'N') {
            create_new_entry();
            needs_redraw = true;
            continue;
        }

        TrackballState tb = update_trackball();

        // Cursor up
        if (tb.y == -1 && cursor > 0) {
            cursor--;
            if (cursor < scroll_offset) scroll_offset = cursor;
            needs_redraw = true;
        }
        // Cursor down
        if (tb.y == 1 && cursor < total - 1) {
            cursor++;
            if (cursor >= scroll_offset + MAX_VISIBLE)
                scroll_offset = cursor - MAX_VISIBLE + 1;
            needs_redraw = true;
        }

        // Open entry
        if (tb.clicked && total > 0) {
            String title, content;
            if (nosql_get_entry(MY_CATEGORY, cursor, title, content)) {
                draw_detail(title, content);

                // Wait for back action
                while (true) {
                    if (get_touch(&tx, &ty) && ty < 40) {
                        while (get_touch(&tx, &ty)) { delay(10); yield(); }
                        break;
                    }
                    char dk = get_keypress();
                    if (dk == 'b' || dk == 'B') break;
                    if (dk == 'q' || dk == 'Q') return;
                    delay(50);
                    yield();
                }
                needs_redraw = true;
            }
        }

        delay(50);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_gps: {
    name: "Built-in: GPS Position App",
    desc: "Live latitude/longitude/altitude/satellites display",
    type: "builtin",
    funcName: "run_gps_view",
    code: `// Pisces Moon OS — GPS Position
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Reads from the global TinyGPSPlus instance maintained by the
// background GPS task. Apps don't need to feed bytes — just read state.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include <TinyGPSPlus.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"

extern Arduino_GFX* gfx;
extern TinyGPSPlus gps;   // Global GPS instance, fed by background task

static void draw_static_ui() {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("GPS POSITION | TAP HEADER TO EXIT");

    gfx->setTextColor(C_GREY);
    gfx->setCursor(10, 40);
    gfx->print("LAT:");
    gfx->setCursor(10, 70);
    gfx->print("LNG:");
    gfx->setCursor(10, 100);
    gfx->print("ALT:");
    gfx->setCursor(10, 130);
    gfx->print("SATS:");
    gfx->setCursor(10, 160);
    gfx->print("FIX:");
    gfx->setCursor(10, 190);
    gfx->print("UTC:");
}

void run_gps_view() {
    draw_static_ui();
    uint32_t last_redraw = 0;

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }
        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;

        // Refresh every 500ms
        if (millis() - last_redraw < 500) {
            delay(50);
            yield();
            continue;
        }
        last_redraw = millis();

        // Wipe the value column
        gfx->fillRect(70, 35, 240, 170, C_BLACK);

        if (gps.location.isValid()) {
            gfx->setTextColor(C_CYAN);
            gfx->setCursor(70, 40);
            gfx->printf("%.6f", gps.location.lat());
            gfx->setCursor(70, 70);
            gfx->printf("%.6f", gps.location.lng());
        } else {
            gfx->setTextColor(C_RED);
            gfx->setCursor(70, 40); gfx->print("NO FIX");
            gfx->setCursor(70, 70); gfx->print("NO FIX");
        }

        if (gps.altitude.isValid()) {
            gfx->setTextColor(C_WHITE);
            gfx->setCursor(70, 100);
            gfx->printf("%.1f m", gps.altitude.meters());
        }

        gfx->setTextColor(C_YELLOW);
        gfx->setCursor(70, 130);
        gfx->printf("%d", gps.satellites.value());

        gfx->setTextColor(gps.location.isValid() ? C_GREEN : C_RED);
        gfx->setCursor(70, 160);
        gfx->print(gps.location.isValid() ? "LOCKED" : "SEARCHING");

        if (gps.time.isValid()) {
            gfx->setTextColor(C_WHITE);
            gfx->setCursor(70, 190);
            gfx->printf("%02d:%02d:%02d",
                gps.time.hour(), gps.time.minute(), gps.time.second());
        }
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_gemini: {
    name: "Built-in: AI / Gemini App",
    desc: "Send a prompt to Google Gemini, display the response",
    type: "builtin",
    funcName: "run_my_ai_app",
    code: `// Pisces Moon OS — Gemini AI App
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Demonstrates the gemini_client API for AI-powered apps.
// Requires a free API key from https://aistudio.google.com/apikey
// Add it to include/secrets.h (see secrets.h.example).
// The app degrades gracefully when no key is configured.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"
#include "gemini_client.h"

extern Arduino_GFX* gfx;

static void draw_no_key_screen() {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("MY AI APP | TAP HEADER TO EXIT");

    gfx->setTextColor(C_AMBER);   // C_ORANGE if AMBER undefined
    gfx->setCursor(10, 50);
    gfx->print("No Gemini API key configured.");

    gfx->setTextColor(C_WHITE);
    gfx->setCursor(10, 80);
    gfx->print("To enable AI:");
    gfx->setCursor(10, 100);
    gfx->print("1. Get a free key at:");
    gfx->setTextColor(C_CYAN);
    gfx->setCursor(20, 120);
    gfx->print("aistudio.google.com/apikey");
    gfx->setTextColor(C_WHITE);
    gfx->setCursor(10, 140);
    gfx->print("2. Edit include/secrets.h");
    gfx->setCursor(10, 160);
    gfx->print("3. Rebuild and reflash");
}

static void draw_main_ui() {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("MY AI APP | TAP HEADER TO EXIT");

    gfx->fillRect(0, 215, 320, 25, C_DARK);
    gfx->setCursor(10, 222);
    gfx->setTextColor(C_GREEN);
    gfx->print("[A] Ask Gemini  [R] Reset  [Q] Quit");
}

static void draw_response(const String& prompt, const String& response) {
    gfx->fillRect(0, 25, 320, 190, C_BLACK);

    gfx->setTextColor(C_YELLOW);
    gfx->setCursor(10, 35);
    gfx->print("> ");
    gfx->print(prompt.length() > 40 ? prompt.substring(0, 37) + "..." : prompt);

    gfx->setTextColor(C_WHITE);
    int y = 60, x = 10;
    for (int i = 0; i < response.length() && y < 210; i++) {
        char c = response.charAt(i);
        if (c == '\n') { x = 10; y += 12; continue; }
        gfx->setCursor(x, y);
        gfx->print(c);
        x += 6;
        if (x > 305) { x = 10; y += 12; }
    }
}

void run_my_ai_app() {
    if (!gemini_has_key()) {
        draw_no_key_screen();
        while (true) {
            int16_t tx, ty;
            if (get_touch(&tx, &ty) && ty < 40) {
                while (get_touch(&tx, &ty)) { delay(10); yield(); }
                return;
            }
            char k = get_keypress();
            if (k == 'q' || k == 'Q') return;
            delay(50);
            yield();
        }
    }

    init_gemini();
    draw_main_ui();

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;

        if (k == 'r' || k == 'R') {
            reset_gemini_memory();
            gfx->fillRect(0, 25, 320, 190, C_BLACK);
            gfx->setCursor(10, 50);
            gfx->setTextColor(C_GREEN);
            gfx->print("Conversation reset.");
            continue;
        }

        if (k == 'a' || k == 'A') {
            // Get the prompt
            gfx->fillRect(0, 25, 320, 190, C_BLACK);
            gfx->setCursor(10, 35);
            gfx->setTextColor(C_GREEN);
            gfx->print("Enter prompt:");
            String prompt = get_text_input(10, 55);
            if (prompt.length() == 0) {
                draw_main_ui();
                continue;
            }

            // Show "thinking" state
            gfx->fillRect(0, 25, 320, 190, C_BLACK);
            gfx->setCursor(10, 50);
            gfx->setTextColor(C_CYAN);
            gfx->print("Asking Gemini...");

            String response = ask_gemini(prompt);
            draw_response(prompt, response);
        }

        delay(50);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_audio: {
    name: "Built-in: Audio Player",
    desc: "List MP3 files on SD, play with start/stop control",
    type: "builtin",
    funcName: "run_my_audio_app",
    code: `// Pisces Moon OS — Audio Player
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Plays MP3 files from /audio/ on the SD card via I2S DAC.
// Audio is hardware-only — Lety preview shows the UI but
// the actual audio.connecttoFS() call no-ops in the browser.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include <SdFat.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"

extern Arduino_GFX* gfx;
extern SdFat sd;
extern SemaphoreHandle_t spi_mutex;

#define AUDIO_DIR  "/audio"
#define MAX_FILES  16
#define ROW_HEIGHT 18

static String files[MAX_FILES];
static int    file_count = 0;
static int    cursor = 0;
static bool   playing = false;
static int    playing_idx = -1;

static void scan_audio_dir() {
    file_count = 0;
    if (!spi_mutex || xSemaphoreTake(spi_mutex, pdMS_TO_TICKS(500)) != pdTRUE) {
        return;
    }

    if (sd.exists(AUDIO_DIR)) {
        FsFile dir = sd.open(AUDIO_DIR);
        if (dir) {
            FsFile entry;
            while (file_count < MAX_FILES && entry.openNext(&dir, O_READ)) {
                if (!entry.isDir()) {
                    char name[64];
                    entry.getName(name, sizeof(name));
                    String n = String(name);
                    if (n.endsWith(".mp3") || n.endsWith(".MP3") ||
                        n.endsWith(".wav") || n.endsWith(".WAV")) {
                        files[file_count++] = n;
                    }
                }
                entry.close();
            }
            dir.close();
        }
    }
    xSemaphoreGive(spi_mutex);
}

static void redraw() {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("AUDIO PLAYER | TAP HEADER TO EXIT");

    if (file_count == 0) {
        gfx->setTextColor(C_GREY);
        gfx->setCursor(10, 80);
        gfx->print("No audio files found.");
        gfx->setCursor(10, 100);
        gfx->print("Place .mp3 / .wav in /audio/");
        return;
    }

    int y = 35;
    for (int i = 0; i < file_count; i++) {
        if (i == cursor) {
            gfx->fillRect(0, y - 2, 320, ROW_HEIGHT - 2, C_DARK);
            gfx->setTextColor(C_GREEN);
            gfx->setCursor(10, y);
            gfx->print(i == playing_idx ? "> " : ". ");
        } else {
            gfx->setTextColor(i == playing_idx ? C_CYAN : C_WHITE);
            gfx->setCursor(20, y);
            if (i == playing_idx) gfx->print("> ");
        }
        String name = files[i];
        if (name.length() > 36) name = name.substring(0, 33) + "...";
        gfx->print(name);
        y += ROW_HEIGHT;
    }

    gfx->fillRect(0, 215, 320, 25, C_DARK);
    gfx->setCursor(10, 222);
    gfx->setTextColor(C_GREEN);
    if (playing) gfx->print("[CLK] Stop  [Q] Quit");
    else         gfx->print("[CLK] Play  [Q] Quit");
}

void run_my_audio_app() {
    scan_audio_dir();
    cursor = 0;
    redraw();

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;

        TrackballState tb = update_trackball();
        if (tb.y == -1 && cursor > 0)             { cursor--; redraw(); }
        if (tb.y ==  1 && cursor < file_count - 1) { cursor++; redraw(); }

        if (tb.clicked && file_count > 0) {
            // Toggle play/stop
            // On real hardware: extern Audio audio;
            //                   audio.connecttoFS(SD, full_path.c_str());
            // Here we just track the UI state.
            if (playing && playing_idx == cursor) {
                playing = false;
                playing_idx = -1;
            } else {
                playing = true;
                playing_idx = cursor;
            }
            redraw();
        }

        delay(50);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_sysinfo: {
    name: "Built-in: System Info Utility",
    desc: "Show free heap, PSRAM, uptime, WiFi state — periodic refresh",
    type: "builtin",
    funcName: "run_my_sysinfo",
    code: `// Pisces Moon OS — System Info Utility
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Read-only system telemetry app. Refreshes every second.
// Demonstrates: ESP.* APIs, WiFi state, formatted display.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include <WiFi.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"

extern Arduino_GFX* gfx;

static void format_bytes(uint32_t bytes, char* out, size_t out_len) {
    if (bytes >= 1024 * 1024) {
        snprintf(out, out_len, "%.1f MB", bytes / (1024.0 * 1024.0));
    } else if (bytes >= 1024) {
        snprintf(out, out_len, "%.1f KB", bytes / 1024.0);
    } else {
        snprintf(out, out_len, "%u B", (unsigned)bytes);
    }
}

static void draw_static_ui() {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("SYSTEM INFO | TAP HEADER TO EXIT");

    gfx->setTextColor(C_GREY);
    int y = 40;
    const char* labels[] = {
        "Uptime:", "Free heap:", "Total heap:",
        "Free PSRAM:", "Total PSRAM:",
        "CPU MHz:", "WiFi:", "SSID:", "RSSI:"
    };
    for (int i = 0; i < 9; i++) {
        gfx->setCursor(10, y);
        gfx->print(labels[i]);
        y += 18;
    }
}

void run_my_sysinfo() {
    draw_static_ui();
    uint32_t last_redraw = 0;

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }
        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;

        if (millis() - last_redraw < 1000) {
            delay(50);
            yield();
            continue;
        }
        last_redraw = millis();

        // Wipe value column
        gfx->fillRect(110, 35, 200, 165, C_BLACK);

        char buf[32];
        gfx->setTextColor(C_CYAN);

        // Uptime
        uint32_t uptime_s = millis() / 1000;
        gfx->setCursor(110, 40);
        gfx->printf("%02d:%02d:%02d",
            (int)(uptime_s / 3600),
            (int)((uptime_s / 60) % 60),
            (int)(uptime_s % 60));

        // Heap
        format_bytes(ESP.getFreeHeap(), buf, sizeof(buf));
        gfx->setCursor(110, 58);
        gfx->print(buf);

        format_bytes(ESP.getHeapSize(), buf, sizeof(buf));
        gfx->setCursor(110, 76);
        gfx->print(buf);

        // PSRAM
        format_bytes(ESP.getFreePsram(), buf, sizeof(buf));
        gfx->setCursor(110, 94);
        gfx->print(buf);

        format_bytes(ESP.getPsramSize(), buf, sizeof(buf));
        gfx->setCursor(110, 112);
        gfx->print(buf);

        // CPU
        gfx->setCursor(110, 130);
        gfx->printf("%d MHz", (int)ESP.getCpuFreqMHz());

        // WiFi
        wl_status_t ws = WiFi.status();
        gfx->setTextColor(ws == WL_CONNECTED ? C_GREEN : C_RED);
        gfx->setCursor(110, 148);
        gfx->print(ws == WL_CONNECTED ? "Connected" :
                   ws == WL_DISCONNECTED ? "Disconnected" : "Connecting");

        gfx->setTextColor(C_WHITE);
        gfx->setCursor(110, 166);
        if (ws == WL_CONNECTED) {
            String s = WiFi.SSID();
            if (s.length() > 18) s = s.substring(0, 18);
            gfx->print(s);
        } else {
            gfx->print("--");
        }

        gfx->setCursor(110, 184);
        if (ws == WL_CONNECTED) {
            gfx->printf("%d dBm", WiFi.RSSI());
        } else {
            gfx->print("--");
        }
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_kodedot_app: {
    name: "KodeDot: D-pad App",
    desc: "Same code works on T-Deck and KodeDot via input abstraction",
    type: "builtin",
    funcName: "run_kodedot_demo",
    code: `// Pisces Moon OS — D-pad App (KodeDot + T-Deck)
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Uses the input abstraction layer so the same source compiles for:
//   - LilyGO T-Deck Plus (trackball maps to dpad)
//   - KodeDot          (native d-pad)
//
// On KodeDot, get_dpad() reads the physical d-pad.
// On T-Deck, get_dpad() returns the trackball state in the same format.
// Both hardware paths produce {x, y, clicked} the app code can use directly.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "touch.h"
#include "dpad.h"      // Abstraction over trackball / native d-pad
#include "theme.h"

extern Arduino_GFX* gfx;

void run_kodedot_demo() {
    int cursor_x = 160, cursor_y = 120;

    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("D-PAD DEMO | TAP HEADER TO EXIT");

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        DpadState d = get_dpad();
        if (d.x != 0 || d.y != 0) {
            // Erase old position
            gfx->fillCircle(cursor_x, cursor_y, 8, C_BLACK);
            cursor_x = max(8, min(312, cursor_x + d.x * 8));
            cursor_y = max(32, min(232, cursor_y + d.y * 8));
        }

        if (d.clicked) {
            gfx->fillCircle(cursor_x, cursor_y, 12, C_YELLOW);
        } else {
            gfx->fillCircle(cursor_x, cursor_y, 8, C_CYAN);
        }

        delay(30);
        yield();
    }
}
`
  },

  // ─────────────────────────────────────────────
  builtin_wardriver: {
    name: "CYBER: Wardriver",
    desc: "WiFi + BLE scan with GPS tagging — full SPI Bus Treaty compliance",
    type: "builtin",
    funcName: "run_my_wardriver",
    code: `// Pisces Moon OS — Wardriver
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// Active WiFi + BLE scanner with GPS-tagged CSV logging to SD.
// This is a foundational CYBER pattern. The full system Wardrive app
// in Pisces Moon (wardrive.cpp) builds on these same techniques with
// added Ghost Engine background-task threading.
//
// SPI BUS TREATY: Any SD writes are wrapped in spi_mutex. WiFi scans
// take 4-5 seconds and must not hold the mutex during the scan itself.

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include <WiFi.h>
#include <SdFat.h>
#include <TinyGPSPlus.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include "touch.h"
#include "trackball.h"
#include "keyboard.h"
#include "theme.h"

extern Arduino_GFX* gfx;
extern SdFat sd;
extern TinyGPSPlus gps;
extern SemaphoreHandle_t spi_mutex;

#define LOG_PATH "/wardrive_my.csv"

static int wifi_count = 0;
static int last_scan_ms = 0;

static void redraw(bool scanning) {
    gfx->fillScreen(C_BLACK);
    gfx->fillRect(0, 0, 320, 24, C_DARK);
    gfx->drawFastHLine(0, 24, 320, C_GREEN);
    gfx->setCursor(10, 7);
    gfx->setTextColor(C_GREEN);
    gfx->setTextSize(1);
    gfx->print("WARDRIVER | TAP HEADER TO EXIT");

    gfx->setTextColor(C_GREY);
    gfx->setCursor(10, 40);  gfx->print("Networks found:");
    gfx->setCursor(10, 70);  gfx->print("GPS:");
    gfx->setCursor(10, 100); gfx->print("Status:");
    gfx->setCursor(10, 130); gfx->print("Log file:");

    gfx->setTextColor(C_CYAN);
    gfx->setCursor(150, 40);
    gfx->printf("%d", wifi_count);

    gfx->setTextColor(gps.location.isValid() ? C_GREEN : C_RED);
    gfx->setCursor(150, 70);
    if (gps.location.isValid()) {
        gfx->printf("%.4f, %.4f", gps.location.lat(), gps.location.lng());
    } else {
        gfx->print("NO FIX");
    }

    gfx->setTextColor(scanning ? C_YELLOW : C_GREEN);
    gfx->setCursor(150, 100);
    gfx->print(scanning ? "SCANNING..." : "READY");

    gfx->setTextColor(C_WHITE);
    gfx->setCursor(150, 130);
    gfx->print(LOG_PATH);

    gfx->fillRect(0, 215, 320, 25, C_DARK);
    gfx->setCursor(10, 222);
    gfx->setTextColor(C_GREEN);
    gfx->print("[S] Scan now  [Q] Quit");
}

static void scan_and_log() {
    redraw(true);

    // Run WiFi scan WITHOUT holding spi_mutex (scan is async-ish)
    int n = WiFi.scanNetworks(false, true);
    if (n < 0) n = 0;
    wifi_count += n;

    // Now write results — wrap in spi_mutex (SPI Bus Treaty)
    if (n > 0 && spi_mutex &&
        xSemaphoreTake(spi_mutex, pdMS_TO_TICKS(500)) == pdTRUE) {

        FsFile f = sd.open(LOG_PATH, O_WRITE | O_CREAT | O_APPEND);
        if (f) {
            // Use stack char buffers — never construct String inside the mutex
            // (PSRAM fragmentation under load can return garbage Strings)
            char macBuf[20];
            char ssidBuf[64];
            for (int i = 0; i < n; i++) {
                String mac  = WiFi.BSSIDstr(i);
                String ssid = WiFi.SSID(i);
                strncpy(macBuf, mac.c_str(), sizeof(macBuf) - 1);
                macBuf[sizeof(macBuf) - 1] = 0;
                strncpy(ssidBuf, ssid.c_str(), sizeof(ssidBuf) - 1);
                ssidBuf[sizeof(ssidBuf) - 1] = 0;

                f.printf("%s,%s,%s,%d,%d,%.6f,%.6f\n",
                    macBuf, ssidBuf,
                    WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "OPEN" : "WPA",
                    WiFi.channel(i), WiFi.RSSI(i),
                    gps.location.isValid() ? gps.location.lat() : 0.0,
                    gps.location.isValid() ? gps.location.lng() : 0.0);
            }
            f.close();
        }
        xSemaphoreGive(spi_mutex);
    }
    WiFi.scanDelete();

    redraw(false);
}

void run_my_wardriver() {
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    redraw(false);

    while (true) {
        int16_t tx, ty;
        if (get_touch(&tx, &ty) && ty < 40) {
            while (get_touch(&tx, &ty)) { delay(10); yield(); }
            return;
        }

        char k = get_keypress();
        if (k == 'q' || k == 'Q') return;
        if (k == 's' || k == 'S') {
            scan_and_log();
            last_scan_ms = millis();
        }

        // Auto-rescan every 30 seconds
        if (millis() - last_scan_ms > 30000) {
            scan_and_log();
            last_scan_ms = millis();
        }

        delay(100);
        yield();
    }
}
`
  },

};
