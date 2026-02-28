'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const io = require('./manifest-io');

const app = express();
app.use(express.json());

// Serve admin UI
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Load OpenAPI spec for Swagger UI
const openApiSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// =============================================================================
// Telemetry ring buffer (in-memory, last 1000 events)
// =============================================================================
const RING_SIZE = 1000;
const telemetryRing = [];

// =============================================================================
// GET /api/sites — Summary list
// =============================================================================
app.get('/api/sites', (req, res) => {
  try {
    const domains = io.listManifests();
    const summaries = domains.map(d => {
      const manifest = io.readManifest(d);
      return manifest ? io.summarize(manifest) : { domain: d, error: 'unreadable' };
    });
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// POST /api/sites — Create a new manifest
// =============================================================================
app.post('/api/sites', (req, res) => {
  const data = req.body;
  if (!data || !data.domain) return res.status(400).json({ error: 'domain field required' });

  if (io.readManifest(data.domain)) {
    return res.status(409).json({ error: `Manifest for ${data.domain} already exists` });
  }

  const result = io.writeManifest(data.domain, data);
  if (!result.ok) return res.status(400).json({ errors: result.errors });
  res.status(201).json({ ok: true, domain: data.domain });
});

// =============================================================================
// GET /api/sites/:domain — Full manifest
// =============================================================================
app.get('/api/sites/:domain', (req, res) => {
  const manifest = io.readManifest(req.params.domain);
  if (!manifest) return res.status(404).json({ error: 'Not found' });
  res.json(manifest);
});

// =============================================================================
// PUT /api/sites/:domain — Replace manifest
// =============================================================================
app.put('/api/sites/:domain', (req, res) => {
  if (!io.readManifest(req.params.domain)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const data = req.body;
  const result = io.writeManifest(req.params.domain, data);
  if (!result.ok) return res.status(400).json({ errors: result.errors });
  res.json({ ok: true });
});

// =============================================================================
// DELETE /api/sites/:domain
// =============================================================================
app.delete('/api/sites/:domain', (req, res) => {
  const deleted = io.deleteManifest(req.params.domain);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// =============================================================================
// POST /api/sites/:domain/enable — SET enabled: true
// =============================================================================
app.post('/api/sites/:domain/enable', (req, res) => {
  const manifest = io.readManifest(req.params.domain);
  if (!manifest) return res.status(404).json({ error: 'Not found' });
  manifest.enabled = true;
  io.writeManifest(req.params.domain, manifest);
  res.json({ ok: true, domain: req.params.domain, enabled: true });
});

// =============================================================================
// POST /api/sites/:domain/disable — SET enabled: false
// =============================================================================
app.post('/api/sites/:domain/disable', (req, res) => {
  const manifest = io.readManifest(req.params.domain);
  if (!manifest) return res.status(404).json({ error: 'Not found' });
  manifest.enabled = false;
  io.writeManifest(req.params.domain, manifest);
  res.json({ ok: true, domain: req.params.domain, enabled: false });
});

// =============================================================================
// GET /api/health — CDN reachability for all sites
// =============================================================================
app.get('/api/health', async (req, res) => {
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/Creggie/speed-layer@main/manifest/';
  const domains = io.listManifests();

  const results = await Promise.all(domains.map(async (domain) => {
    const url = CDN_BASE + domain + '.json';
    const start = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return { domain, cdnUrl: url, status: 'error', latencyMs, valid: null, error: `HTTP ${response.status}` };
      }
      let valid = false;
      try {
        const data = await response.json();
        const v = io.validateManifest(data);
        valid = v.valid;
      } catch (e) {
        return { domain, cdnUrl: url, status: 'error', latencyMs, valid: false, error: 'JSON parse error' };
      }
      return { domain, cdnUrl: url, status: 'ok', latencyMs, valid };
    } catch (err) {
      return {
        domain,
        cdnUrl: url,
        status: err.name === 'AbortError' ? 'timeout' : 'error',
        latencyMs: Date.now() - start,
        valid: null,
        error: err.message
      };
    }
  }));

  res.json(results);
});

// =============================================================================
// POST /api/telemetry — Receive beacon from loader
// =============================================================================
app.post('/api/telemetry', (req, res) => {
  const event = req.body;
  if (!event) return res.status(400).json({ error: 'No body' });
  event._receivedAt = Date.now();
  telemetryRing.push(event);
  if (telemetryRing.length > RING_SIZE) telemetryRing.shift();
  res.status(204).end();
});

// =============================================================================
// GET /api/telemetry — Read ring buffer
// =============================================================================
app.get('/api/telemetry', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, RING_SIZE);
  res.json(telemetryRing.slice(-limit));
});

// =============================================================================
// Start server
// =============================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Speed Layer API] Listening on http://localhost:${PORT}`);
  console.log(`  Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`  Admin UI:   http://localhost:${PORT}/admin`);
});

module.exports = app;
