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
    name: "ELF Module: Standalone",
    desc: "Loadable .elf module that runs from SD card",
    type: "elf",
    funcName: "elf_main",
    code: `// Pisces Moon OS — My ELF Module
// Copyright (C) 2026 Your Name
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
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
    gfx->print("ELF MODULE | TAP HEADER TO EXIT");

    // Content
    gfx->setTextSize(2);
    gfx->setTextColor(0xFFFF);
    gfx->setCursor(10, 60);
    gfx->print("Hello from ELF!");

    gfx->setTextSize(1);
    gfx->setTextColor(0x07FF);  // Cyan
    gfx->setCursor(10, 100);
    gfx->print("Loaded into PSRAM at runtime");

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
      api: [1, 0]
    }
  },

};
