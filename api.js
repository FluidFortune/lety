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

  "NFC / RFID": [
    { name: "NfcTag tag = nfc_poll()",          desc: "Returns NfcTag (tag.valid = true if present)" },
    { name: "tag.uid_len",                      desc: "Length of UID byte array (4 or 7 typical)" },
    { name: "tag.uid[i]",                       desc: "UID bytes (uint8_t)" },
    { name: "tag.ndef_text",                    desc: "Decoded NDEF text record (char[128])" },
    { name: "tag.data, tag.data_len",           desc: "Raw tag payload" },
    { name: "RfidTag rfid = rfid_poll()",       desc: "Returns 125kHz RFID tag" },
    { name: "rfid.id",                          desc: "32-bit card ID" },
    { name: "rfid.id_str",                      desc: "Hex string e.g. \"00DEADC0\"" },
    { name: "nfc_write(&tag, data, len)",       desc: "Write payload to NFC tag" },
  ],

  "Mesh / LoRa": [
    { name: "mesh_send(target_id, msg)",        desc: "Send message via LoRa mesh (stubbed in preview)" },
    { name: "MeshMessage m = mesh_receive()",   desc: "Poll for incoming message (m.valid if present)" },
    { name: "m.from, m.to, m.text",             desc: "Sender ID, recipient ID, message body" },
    { name: "m.rssi",                           desc: "Signal strength of received message" },
    { name: "mesh_node_id()",                   desc: "This device's mesh ID (uint16_t)" },
    { name: "// LoRa note",                     desc: "Real radio TX only on hardware. UI fully previewable." },
  ],

  "NoSQL Database": [
    { name: "nosql_init(category)",             desc: "Create category folder if missing — call once" },
    { name: "nosql_save_entry(cat, title, content, tags)", desc: "Save a new JSON document" },
    { name: "nosql_get_count(category)",        desc: "Returns number of entries (int)" },
    { name: "nosql_get_entry(cat, idx, &title, &content)", desc: "Load entry by 0-based index" },
    { name: "nosql_search(cat, keyword, &title, &content)", desc: "First match in title or tags" },
    { name: "nosql_category_path(category)",    desc: "Returns /data/<category> path" },
    { name: "// SD path",                       desc: "Storage at /data/<category>/index.json + entry_N.json" },
    { name: "// Treaty",                        desc: "All nosql_* functions take spi_mutex internally" },
  ],

  "GPS (TinyGPSPlus)": [
    { name: "extern TinyGPSPlus gps",           desc: "Global instance, fed by background UART task" },
    { name: "gps.location.isValid()",           desc: "True when GPS has a fix" },
    { name: "gps.location.lat()",               desc: "Latitude in decimal degrees (double)" },
    { name: "gps.location.lng()",               desc: "Longitude in decimal degrees (double)" },
    { name: "gps.altitude.meters()",            desc: "Altitude above sea level (double)" },
    { name: "gps.satellites.value()",           desc: "Number of satellites in view" },
    { name: "gps.time.hour() / minute() / second()", desc: "UTC time components" },
    { name: "gps.speed.kmph()",                 desc: "Speed over ground in km/h" },
    { name: "gps.course.deg()",                 desc: "Heading in degrees from north" },
  ],

  "AI / Gemini": [
    { name: "init_gemini()",                    desc: "Initialize chat history — call once" },
    { name: "bool gemini_has_key()",            desc: "True if API key configured in secrets.h" },
    { name: "String ask_gemini(prompt)",        desc: "Send prompt, get response (maintains history)" },
    { name: "reset_gemini_memory()",            desc: "Clear conversation history" },
    { name: "// Setup",                         desc: "Get free key at aistudio.google.com/apikey" },
    { name: "// File",                          desc: "Add to include/secrets.h (gitignored)" },
  ],

  "Audio (I2S)": [
    { name: "extern Audio audio",               desc: "Global I2S audio output instance" },
    { name: "audio.connecttoFS(SD, path)",      desc: "Stream MP3/WAV from SD" },
    { name: "audio.stopSong()",                 desc: "Stop current playback" },
    { name: "audio.isRunning()",                desc: "True if currently playing" },
    { name: "audio.setVolume(0-21)",            desc: "Volume level" },
    { name: "audio.loop()",                     desc: "Call in main loop to feed audio buffer" },
  ],

  "WiFi & ESP System": [
    { name: "WiFi.status()",                    desc: "Returns WL_CONNECTED / WL_DISCONNECTED etc" },
    { name: "WiFi.SSID()",                      desc: "Connected network SSID (String)" },
    { name: "WiFi.RSSI()",                      desc: "Signal strength in dBm" },
    { name: "WiFi.localIP()",                   desc: "Current IP address" },
    { name: "ESP.getFreeHeap()",                desc: "Free heap RAM in bytes" },
    { name: "ESP.getFreePsram()",               desc: "Free PSRAM in bytes" },
    { name: "ESP.getCpuFreqMHz()",              desc: "CPU clock in MHz" },
    { name: "ESP.restart()",                    desc: "Soft reboot the device" },
  ],

  "D-Pad (KodeDot + T-Deck)": [
    { name: "DpadState d = get_dpad()",         desc: "Unified d-pad / trackball API" },
    { name: "d.x  (-1, 0, 1)",                  desc: "LEFT, neutral, RIGHT" },
    { name: "d.y  (-1, 0, 1)",                  desc: "UP, neutral, DOWN" },
    { name: "d.clicked",                        desc: "Button press" },
    { name: "// Hardware mapping",              desc: "T-Deck → trackball; KodeDot → native d-pad" },
    { name: "// Same code",                     desc: "Compiles unchanged for both devices" },
  ],

  "WiFi Scanning (CYBER)": [
    { name: "WiFi.mode(WIFI_STA)",              desc: "Set station mode for scanning" },
    { name: "WiFi.disconnect()",                desc: "Detach before scan" },
    { name: "int n = WiFi.scanNetworks()",      desc: "Active scan, returns count (blocks ~4s)" },
    { name: "WiFi.SSID(i), WiFi.BSSIDstr(i)",   desc: "Result fields (String)" },
    { name: "WiFi.RSSI(i), WiFi.channel(i)",    desc: "Signal strength, channel" },
    { name: "WiFi.encryptionType(i)",           desc: "WIFI_AUTH_OPEN, WIFI_AUTH_WPA2_PSK, etc" },
    { name: "WiFi.scanDelete()",                desc: "Free scan results — call after reading" },
    { name: "// Treaty",                        desc: "Wrap SD writes in spi_mutex; never hold during scan" },
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
