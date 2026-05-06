// Pisces Moon OS — Example Launcher (Annotated Reference)
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// fluidfortune.com
//
// ════════════════════════════════════════════════════════════════
//  This is a SIMPLIFIED REFERENCE version of the real
//  src/launcher.cpp in the Pisces Moon repo. It exists to show
//  exactly where a new built-in app gets wired in.
//
//  When Lety's Export button generates an integration.txt file,
//  it tells you the precise diff to apply to the REAL launcher.cpp.
//  This file is just here so you can see the structure without
//  having to read all 1000+ lines of the production launcher.
// ════════════════════════════════════════════════════════════════

#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include "apps.h"        // Function declarations for every built-in app
#include "theme.h"
#include "touch.h"
#include "trackball.h"

extern Arduino_GFX* gfx;

// ─────────────────────────────────────────────
//  STEP 1 — APP IDs
//  Every built-in app gets a unique numeric ID.
//  Pick the next free number when adding yours.
// ─────────────────────────────────────────────
#define APP_NOTEPAD       1
#define APP_CALCULATOR    2
#define APP_CLOCK         3
#define APP_FILE_BROWSER  4
#define APP_GPS           5
// ... existing apps continue ...
#define APP_BRIDGE       48
#define APP_MY_NEW_APP   49   // ← Your new app goes here


// ─────────────────────────────────────────────
//  STEP 2 — CATEGORY MENUS
//  The home screen has 7 categories. Each holds
//  a list of {label, app_id} entries. Add your
//  app to whichever category fits.
// ─────────────────────────────────────────────
struct AppEntry {
    const char* label;
    int         id;
};

struct Category {
    const char* name;
    const char* icon;
    uint16_t    color;
    AppEntry    apps[16];
    int         count;
};

static Category CATEGORIES[] = {

    { "TOOLS", "T", 0x8C00, {
        { "NOTEPAD",     APP_NOTEPAD     },
        { "CALCULATOR",  APP_CALCULATOR  },
        { "CLOCK",       APP_CLOCK       },
        { "MY NEW APP",  APP_MY_NEW_APP  },   // ← Add your entry
      }, 4 },

    { "COMMS", "C", 0x07FF, {
        { "GPS",         APP_GPS         },
        // ... etc ...
      }, 1 },

    { "CYBER", "X", 0xF800, {
        // CYBER apps...
      }, 0 },

    // GAMES, INTEL, MEDIA, SYSTEM categories follow
    // the same pattern.
};


// ─────────────────────────────────────────────
//  STEP 3 — DISPATCH SWITCH
//  When the user taps an app on the home screen,
//  launchApp() is called with that app's ID.
//  Add a case for your app that calls its run_*() function.
// ─────────────────────────────────────────────
void launchApp(int appId) {
    switch (appId) {
        case APP_NOTEPAD:       run_notepad();       break;
        case APP_CALCULATOR:    run_calculator();    break;
        case APP_CLOCK:         run_clock();         break;
        case APP_FILE_BROWSER:  run_filesystem();    break;
        case APP_GPS:           run_gps_view();      break;
        // ... existing dispatches ...
        case APP_BRIDGE:        run_bridge();        break;

        // ↓ Your new app ↓
        case APP_MY_NEW_APP:    run_my_new_app();    break;

        default:
            // Unknown app ID — show error
            gfx->fillScreen(C_BLACK);
            gfx->setTextColor(C_RED);
            gfx->setCursor(10, 100);
            gfx->print("Unknown app ID");
            delay(1500);
            break;
    }
}


// ─────────────────────────────────────────────
//  WHAT'S IN APPS.H
//  apps.h is just a list of function declarations
//  so launcher.cpp knows your function exists.
//
//  apps.h:
//    void run_notepad();
//    void run_calculator();
//    ...
//    void run_my_new_app();   ← Add this line
// ─────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════
//  SUMMARY — to add a built-in app:
//
//  1. Drop your_app.cpp into src/
//  2. Add `void run_your_app();` to include/apps.h
//  3. In src/launcher.cpp:
//     a. #define APP_YOUR_APP <next free number>
//     b. Add {"YOUR APP", APP_YOUR_APP} to a category's array
//        (and bump the array's count value)
//     c. Add `case APP_YOUR_APP: run_your_app(); break;`
//        to the launchApp() switch
//  4. pio run -e esp32s3 -t upload
//
//  Lety's Export button generates the exact lines for you.
// ════════════════════════════════════════════════════════════════
