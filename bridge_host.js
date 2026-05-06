// Pisces Bridge Host — Lety
// Copyright (C) 2026 Eric Becker / Fluid Fortune
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Manages a Web Serial connection to a Pisces Bridge device.
// Parses incoming JSON events, dispatches to UI handlers.
// Sends commands to the device.
//
// USAGE:
//   const bridge = new BridgeHost();
//   bridge.on('ready', (ev) => { ... });
//   bridge.on('wifi_seen', (ev) => { ... });
//   bridge.on('ble_seen', (ev) => { ... });
//   await bridge.connect();
//   await bridge.send({ cmd: 'wardrive_start' });

class BridgeHost {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.connected = false;
    this.capabilities = [];
    this.deviceInfo = null;
    this.handlers = {};
    this._readBuffer = '';
    this._readLoopActive = false;
    this._stats = {
      eventsReceived: 0,
      commandsSent: 0,
      wifiSeen: 0,
      bleSeen: 0,
      loraRx: 0,
    };
  }

  // Register a handler for a specific event type, or '*' for all
  on(eventType, handler) {
    if (!this.handlers[eventType]) this.handlers[eventType] = [];
    this.handlers[eventType].push(handler);
  }

  off(eventType, handler) {
    if (!this.handlers[eventType]) return;
    this.handlers[eventType] = this.handlers[eventType].filter(h => h !== handler);
  }

  _emit(eventType, data) {
    (this.handlers[eventType] || []).forEach(h => {
      try { h(data); } catch (e) { console.error('Handler error:', e); }
    });
    (this.handlers['*'] || []).forEach(h => {
      try { h(eventType, data); } catch (e) { console.error('Handler error:', e); }
    });
  }

  hasCapability(cap) {
    return this.capabilities.includes(cap);
  }

  getStats() {
    return { ...this._stats };
  }

  async connect() {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported. Use Chrome, Edge, or Opera on desktop.');
    }

    if (this.connected) {
      throw new Error('Already connected to a bridge');
    }

    // Request a port from the user (browser shows a picker)
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 });

    // Set up the writer for sending commands
    const encoder = new TextEncoderStream();
    encoder.readable.pipeTo(this.port.writable);
    this.writer = encoder.writable.getWriter();

    // Set up the reader for receiving events
    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();

    this.connected = true;
    this._emit('connect', { port: this.port });

    // Start the read loop in the background
    this._readLoop();

    return this.port;
  }

  async disconnect() {
    if (!this.connected) return;
    this._readLoopActive = false;

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (e) {
      console.warn('Disconnect cleanup error:', e);
    }

    this.connected = false;
    this.capabilities = [];
    this.deviceInfo = null;
    this._emit('disconnect', {});
  }

  async send(obj) {
    if (!this.connected || !this.writer) {
      throw new Error('Not connected to a bridge');
    }
    const line = JSON.stringify(obj) + '\n';
    await this.writer.write(line);
    this._stats.commandsSent++;
    this._emit('_command_sent', obj);
  }

  // Convenience methods
  async startWardrive() { return this.send({ cmd: 'wardrive_start' }); }
  async stopWardrive()  { return this.send({ cmd: 'wardrive_stop' });  }
  async ping()          { return this.send({ cmd: 'ping' }); }
  async getStatus()     { return this.send({ cmd: 'status' }); }
  async getSysinfo()    { return this.send({ cmd: 'sysinfo' }); }
  async getGPS()        { return this.send({ cmd: 'gps' }); }
  async wifiScan()      { return this.send({ cmd: 'wifi_scan' }); }
  async loraRxStart()   { return this.send({ cmd: 'lora_rx_start' }); }
  async loraRxStop()    { return this.send({ cmd: 'lora_rx_stop' }); }
  async loraTx(hex)     { return this.send({ cmd: 'lora_tx', hex }); }

  async _readLoop() {
    this._readLoopActive = true;

    while (this._readLoopActive && this.reader) {
      try {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this._handleChunk(value);
      } catch (e) {
        if (this._readLoopActive) {
          console.error('Read loop error:', e);
          this._emit('error', { message: e.message });
        }
        break;
      }
    }

    if (this.connected) {
      this.connected = false;
      this._emit('disconnect', { reason: 'read_loop_ended' });
    }
  }

  _handleChunk(chunk) {
    this._readBuffer += chunk;

    // Process complete lines
    let nl;
    while ((nl = this._readBuffer.indexOf('\n')) >= 0) {
      const line = this._readBuffer.slice(0, nl).trim();
      this._readBuffer = this._readBuffer.slice(nl + 1);
      if (line.length === 0) continue;

      try {
        const event = JSON.parse(line);
        this._handleEvent(event);
      } catch (e) {
        // Not JSON — emit as raw log line
        this._emit('raw', { line });
      }
    }

    // Prevent runaway buffer growth on malformed input
    if (this._readBuffer.length > 16384) {
      console.warn('Bridge buffer overflow — flushing');
      this._readBuffer = '';
    }
  }

  _handleEvent(event) {
    this._stats.eventsReceived++;

    // Special handling for the ready event — extracts capabilities
    if (event.event === 'ready') {
      this.capabilities = event.capabilities || [];
      this.deviceInfo = {
        os: event.os,
        version: event.version,
        device: event.device,
        id: event.id,
      };
    }

    // Update per-type stats
    if (event.event === 'wifi_seen') this._stats.wifiSeen++;
    if (event.event === 'ble_seen')  this._stats.bleSeen++;
    if (event.event === 'lora_rx')   this._stats.loraRx++;

    // Dispatch to handlers — by event type and to wildcard
    if (event.event) {
      this._emit(event.event, event);
    } else if (event.ok !== undefined) {
      this._emit('_response', event);
    }
  }
}

// Expose globally for IDE integration
if (typeof window !== 'undefined') {
  window.BridgeHost = BridgeHost;
}
