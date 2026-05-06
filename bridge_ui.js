// Pisces Bridge UI Controller — Lety
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Wires the Bridge modal to a BridgeHost instance. Handles:
//   - Connect / disconnect lifecycle
//   - Capability-aware UI gating (hides controls the device doesn't support)
//   - Live event stream display
//   - Stat counters
//   - Command button actions

(function () {
  let bridge = null;
  let consoleEl, statusTextEl, capsRowEl, capsListEl;
  let controlsEl, statsEl;
  let connectBtn, disconnectBtn, closeBtn;
  let modal;

  // Throttle event log writes — too many wifi_seen events can DOM-bomb
  const MAX_LOG_LINES = 200;

  function logEvent(type, payload, color) {
    if (!consoleEl) return;
    const ts = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.style.color = color || '#9ca3af';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '11px';
    div.style.padding = '2px 0';
    div.textContent = `[${ts}] ${type}: ${payload}`;
    consoleEl.appendChild(div);

    // Auto-scroll to bottom
    consoleEl.scrollTop = consoleEl.scrollHeight;

    // Cap the log size
    while (consoleEl.children.length > MAX_LOG_LINES) {
      consoleEl.removeChild(consoleEl.firstChild);
    }
  }

  function clearConsole() {
    if (consoleEl) consoleEl.innerHTML = '';
  }

  function setStatus(text, color) {
    if (!statusTextEl) return;
    statusTextEl.textContent = text;
    statusTextEl.style.color = color || '#6b7280';
  }

  function showConnected(deviceInfo, capabilities) {
    setStatus(
      `Connected to ${deviceInfo.os} v${deviceInfo.version} on ${deviceInfo.device} (ID ${deviceInfo.id})`,
      '#00ff88'
    );

    capsListEl.textContent = capabilities.join(', ') || '(none advertised)';
    capsRowEl.style.display = 'block';
    controlsEl.style.display = 'block';
    statsEl.style.display = 'block';

    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'inline-block';

    // Apply capability gating to all buttons with data-cap
    document.querySelectorAll('#bridge-controls [data-cap]').forEach(btn => {
      const cap = btn.dataset.cap;
      btn.disabled = !capabilities.includes(cap);
      btn.style.opacity = btn.disabled ? '0.4' : '1';
      btn.title = btn.disabled ? `Device does not advertise: ${cap}` : '';
    });
  }

  function showDisconnected() {
    setStatus('Not connected. Click "Connect" to select a device.', '#6b7280');
    capsRowEl.style.display = 'none';
    controlsEl.style.display = 'none';
    statsEl.style.display = 'none';
    connectBtn.style.display = 'inline-block';
    disconnectBtn.style.display = 'none';

    // Re-enable all controls (will be re-gated on next connect)
    document.querySelectorAll('#bridge-controls [data-cap]').forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.title = '';
    });
  }

  function updateStats() {
    if (!bridge) return;
    const s = bridge.getStats();
    document.getElementById('bridge-stat-wifi').textContent  = s.wifiSeen;
    document.getElementById('bridge-stat-ble').textContent   = s.bleSeen;
    document.getElementById('bridge-stat-lora').textContent  = s.loraRx;
    document.getElementById('bridge-stat-events').textContent = s.eventsReceived;
  }

  function attachEventHandlers() {
    bridge.on('ready', (ev) => {
      logEvent('READY', `${ev.os} v${ev.version} on ${ev.device}`, '#00ff88');
      showConnected(bridge.deviceInfo, bridge.capabilities);
    });

    bridge.on('wifi_seen', (ev) => {
      const geo = (ev.lat && ev.lng) ? ` @${ev.lat.toFixed(4)},${ev.lng.toFixed(4)}` : '';
      logEvent('WIFI', `${ev.ssid || '(hidden)'} [${ev.mac}] RSSI:${ev.rssi} ch${ev.ch}${geo}`, '#00ff88');
      updateStats();
    });

    bridge.on('ble_seen', (ev) => {
      logEvent('BLE', `${ev.name || '(unnamed)'} [${ev.mac}] RSSI:${ev.rssi}`, '#00d4ff');
      updateStats();
    });

    bridge.on('lora_rx', (ev) => {
      logEvent('LORA RX', `${ev.len}B  RSSI:${ev.rssi}  SNR:${ev.snr}  hex:${ev.hex.substring(0, 32)}${ev.hex.length > 32 ? '...' : ''}`, '#ff00ff');
      updateStats();
    });

    bridge.on('gps', (ev) => {
      if (ev.valid) {
        logEvent('GPS', `${ev.lat.toFixed(6)}, ${ev.lng.toFixed(6)}  alt:${ev.alt_m}m  sats:${ev.sats}`, '#fbbf24');
      } else {
        logEvent('GPS', `NO FIX (sats:${ev.sats || 0})`, '#ef4444');
      }
    });

    bridge.on('sysinfo', (ev) => {
      logEvent('SYSINFO', `${ev.chip_model} @${ev.cpu_mhz}MHz  heap:${ev.free_heap}/${ev.heap_size}  psram:${ev.free_psram}/${ev.psram_size}`, '#a78bfa');
    });

    bridge.on('status', (ev) => {
      logEvent('STATUS', `wardrive:${ev.wardrive}  uptime:${ev.uptime_s}s  heap:${ev.free_heap}`, '#9ca3af');
    });

    bridge.on('wardrive_status', (ev) => {
      logEvent('WARDRIVE', ev.active ? 'ACTIVE' : 'IDLE', ev.active ? '#ff3131' : '#9ca3af');
    });

    bridge.on('wifi_scan_done', (ev) => {
      logEvent('SCAN DONE', `Found ${ev.count} networks`, '#00ff88');
    });

    bridge.on('pong', (ev) => {
      logEvent('PONG', `ts:${ev.ts}`, '#9ca3af');
    });

    bridge.on('log', (ev) => {
      logEvent('LOG', ev.msg, '#fbbf24');
    });

    bridge.on('lora_tx_done', (ev) => {
      logEvent('LORA TX', `Sent ${ev.len}B`, '#ff00ff');
    });

    bridge.on('disconnect', () => {
      logEvent('DISCONNECT', 'Bridge disconnected', '#ef4444');
      showDisconnected();
    });

    bridge.on('error', (ev) => {
      logEvent('ERROR', ev.message, '#ef4444');
    });

    bridge.on('raw', (ev) => {
      logEvent('RAW', ev.line, '#6b7280');
    });

    bridge.on('_command_sent', (cmd) => {
      logEvent('TX CMD', JSON.stringify(cmd), '#06b6d4');
    });

    bridge.on('_response', (resp) => {
      const color = resp.ok ? '#00ff88' : '#ef4444';
      logEvent(resp.ok ? 'OK' : 'ERR', resp.msg || resp.error || '', color);
    });
  }

  async function connect() {
    if (!bridge) bridge = new BridgeHost();
    attachEventHandlers();

    try {
      await bridge.connect();
      logEvent('CONNECT', 'Serial port opened — waiting for ready event...', '#00d4ff');
    } catch (e) {
      logEvent('ERROR', e.message, '#ef4444');
      setStatus(`Connection failed: ${e.message}`, '#ef4444');
    }
  }

  async function disconnect() {
    if (!bridge) return;
    try {
      // Stop wardrive politely before disconnecting
      try { await bridge.stopWardrive(); } catch (e) { /* ignore */ }
      await bridge.disconnect();
    } catch (e) {
      console.warn('Disconnect error:', e);
    }
  }

  function init() {
    modal           = document.getElementById('modal-bridge');
    consoleEl       = document.getElementById('bridge-console');
    statusTextEl    = document.getElementById('bridge-status-text');
    capsRowEl       = document.getElementById('bridge-capabilities');
    capsListEl      = document.getElementById('bridge-caps-list');
    controlsEl      = document.getElementById('bridge-controls');
    statsEl         = document.getElementById('bridge-stats');
    connectBtn      = document.getElementById('bridge-btn-connect');
    disconnectBtn   = document.getElementById('bridge-btn-disconnect');
    closeBtn        = document.getElementById('bridge-btn-close');

    // Open the modal
    document.getElementById('btn-bridge').addEventListener('click', () => {
      modal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    connectBtn.addEventListener('click', connect);
    disconnectBtn.addEventListener('click', disconnect);

    // Command buttons
    document.getElementById('bridge-btn-wd-start').addEventListener('click',
      () => bridge && bridge.startWardrive().catch(e => logEvent('ERROR', e.message, '#ef4444')));
    document.getElementById('bridge-btn-wd-stop').addEventListener('click',
      () => bridge && bridge.stopWardrive().catch(e => logEvent('ERROR', e.message, '#ef4444')));
    document.getElementById('bridge-btn-wifi').addEventListener('click',
      () => bridge && bridge.wifiScan().catch(e => logEvent('ERROR', e.message, '#ef4444')));
    document.getElementById('bridge-btn-gps').addEventListener('click',
      () => bridge && bridge.getGPS().catch(e => logEvent('ERROR', e.message, '#ef4444')));
    document.getElementById('bridge-btn-lora-rx').addEventListener('click',
      () => bridge && bridge.loraRxStart().catch(e => logEvent('ERROR', e.message, '#ef4444')));
    document.getElementById('bridge-btn-lora-rx-stop').addEventListener('click',
      () => bridge && bridge.loraRxStop().catch(e => logEvent('ERROR', e.message, '#ef4444')));
    document.getElementById('bridge-btn-status').addEventListener('click',
      () => bridge && bridge.getStatus().catch(e => logEvent('ERROR', e.message, '#ef4444')));

    showDisconnected();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
