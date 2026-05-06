// Pisces Moon OS — IDE API Reference
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later

const PISCES_API = {
  "Display (gfx->)": [
    { name: "fillScreen(color)",                desc: "Fill entire screen with color" },
    { name: "fillRect(x, y, w, h, color)",      desc: "Filled rectangle" },
    { name: "drawRect(x, y, w, h, color)",      desc: "Outlined rectangle" },
    { name: "drawRoundRect(x, y, w, h, r, color)", desc: "Rounded outlined rect" },
    { name: "fillRoundRect(x, y, w, h, r, color)", desc: "Filled rounded rect" },
    { name: "drawLine(x0, y0, x1, y1, color)",  desc: "Line between two points" },
    { name: "drawFastHLine(x, y, w, color)",    desc: "Horizontal line" },
    { name: "drawFastVLine(x, y, h, color)",    desc: "Vertical line" },
    { name: "drawCircle(cx, cy, r, color)",     desc: "Outlined circle" },
    { name: "fillCircle(cx, cy, r, color)",     desc: "Filled circle" },
    { name: "drawTriangle(x0,y0,x1,y1,x2,y2,c)", desc: "Outlined triangle" },
    { name: "fillTriangle(x0,y0,x1,y1,x2,y2,c)", desc: "Filled triangle" },
    { name: "setCursor(x, y)",                  desc: "Set text cursor position" },
    { name: "setTextColor(color)",              desc: "Set text foreground color" },
    { name: "setTextSize(size)",                desc: "Text size 1=6x8, 2=12x16, etc" },
    { name: "print(text)",                      desc: "Print at cursor (no newline)" },
    { name: "println(text)",                    desc: "Print with newline" },
    { name: "printf(fmt, ...)",                 desc: "Formatted print" },
    { name: "drawPixel(x, y, color)",           desc: "Set single pixel" },
  ],

  "Touch": [
    { name: "get_touch(&tx, &ty)",              desc: "Returns true if touched, sets tx/ty" },
    { name: "// HEADER TAP CONVENTION",         desc: "Use ty < 40 to detect header taps" },
  ],

  "Trackball": [
    { name: "TrackballState tb = update_trackball()",       desc: "UI navigation (250ms lockout)" },
    { name: "TrackballState tb = update_trackball_game()",  desc: "Games (80ms lockout)" },
    { name: "tb.x == -1",                       desc: "LEFT" },
    { name: "tb.x == 1",                        desc: "RIGHT" },
    { name: "tb.y == -1",                       desc: "UP" },
    { name: "tb.y == 1",                        desc: "DOWN" },
    { name: "tb.clicked",                       desc: "Trackball pressed" },
  ],

  "Keyboard": [
    { name: "char k = get_keypress()",          desc: "0 if no key, ASCII char otherwise" },
    { name: "String s = get_text_input(x, y)",  desc: "Modal text input" },
  ],

  "Timing": [
    { name: "delay(ms)",                        desc: "Block for ms milliseconds" },
    { name: "millis()",                         desc: "Milliseconds since boot" },
    { name: "yield()",                          desc: "Yield to other tasks (use in loops)" },
  ],

  "Theme Colors": [
    { name: "C_BLACK",   desc: "0x0000" },
    { name: "C_WHITE",   desc: "0xFFFF" },
    { name: "C_GREEN",   desc: "0x07E0  Pisces Moon signature" },
    { name: "C_RED",     desc: "0xF800" },
    { name: "C_BLUE",    desc: "0x001F" },
    { name: "C_YELLOW",  desc: "0xFFE0" },
    { name: "C_CYAN",    desc: "0x07FF" },
    { name: "C_MAGENTA", desc: "0xF81F" },
    { name: "C_ORANGE",  desc: "0xFC00" },
    { name: "C_GREY",    desc: "0x8410  (NOT C_DIM!)" },
    { name: "C_DARK",    desc: "0x18C3  Header background" },
  ],

  "SPI Bus Treaty": [
    { name: "extern SemaphoreHandle_t spi_mutex", desc: "MUST be taken before any SD I/O" },
    { name: "xSemaphoreTake(spi_mutex, pdMS_TO_TICKS(500))", desc: "Take mutex with timeout" },
    { name: "xSemaphoreGive(spi_mutex)",        desc: "Release mutex (always pair with take)" },
    { name: "// Treaty rule",                   desc: "Wrap ALL sd.* and FsFile.* calls" },
  ],

  "Common Patterns": [
    { name: "// Header tap to exit",            desc: "if (get_touch(&tx,&ty) && ty<40) return;" },
    { name: "// Wait for touch release",        desc: "while(get_touch(&tx,&ty)){delay(10);}" },
    { name: "// Standard app loop",             desc: "while(true){ /* input + render */ delay(50); }" },
  ],
};

// Build flat list for filtering
const PISCES_API_FLAT = [];
for (const [cat, items] of Object.entries(PISCES_API)) {
  for (const item of items) {
    PISCES_API_FLAT.push({ category: cat, ...item });
  }
}

// Color hex map for the JS interpreter
const PISCES_COLORS = {
  C_BLACK:   0x0000,
  C_WHITE:   0xFFFF,
  C_GREEN:   0x07E0,
  C_RED:     0xF800,
  C_BLUE:    0x001F,
  C_YELLOW:  0xFFE0,
  C_CYAN:    0x07FF,
  C_MAGENTA: 0xF81F,
  C_ORANGE:  0xFC00,
  C_GREY:    0x8410,
  C_DARK:    0x18C3,
};
