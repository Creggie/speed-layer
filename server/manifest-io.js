'use strict';
/**
 * manifest-io.js — Shared atomic disk I/O for manifests.
 * Used by both the CLI and the REST API server.
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const MANIFEST_DIR = path.join(__dirname, '..', 'manifest');
const SCHEMA_PATH = path.join(__dirname, '..', 'manifest.schema.json');

// AJV instance — compiled once
let _validate = null;
function getValidator() {
  if (!_validate) {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    _validate = ajv.compile(schema);
  }
  return _validate;
}

function manifestPath(domain) {
  // Sanitize domain to prevent path traversal
  const safe = domain.replace(/[^a-zA-Z0-9.\-]/g, '');
  if (!safe || safe !== domain) throw new Error('Invalid domain name');
  return path.join(MANIFEST_DIR, safe + '.json');
}

/**
 * List all manifest domain names (without .json extension).
 */
function listManifests() {
  return fs.readdirSync(MANIFEST_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
    .sort();
}

/**
 * Read a manifest by domain name. Returns parsed object or null if not found.
 */
function readManifest(domain) {
  const filePath = manifestPath(domain);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Validate a manifest object against the schema.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
function validateManifest(data) {
  const validate = getValidator();
  const valid = validate(data);
  if (valid) return { valid: true };
  return {
    valid: false,
    errors: validate.errors.map(e => ({
      path: e.instancePath || '(root)',
      message: e.message
    }))
  };
}

/**
 * Write a manifest atomically (temp file → rename).
 * Validates against schema before writing.
 * Returns { ok: true } or { ok: false, errors: [...] }
 */
function writeManifest(domain, data) {
  const result = validateManifest(data);
  if (!result.valid) return { ok: false, errors: result.errors };

  const filePath = manifestPath(domain);
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPath, filePath);
  return { ok: true };
}

/**
 * Delete a manifest file. Returns true if deleted, false if not found.
 */
function deleteManifest(domain) {
  const filePath = manifestPath(domain);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

/**
 * Get a summary object for a manifest (for list endpoints).
 */
function summarize(data) {
  return {
    domain: data.domain,
    platform: data.platform || null,
    enabled: data.enabled,
    pagesMode: data.pages ? data.pages.mode : 'all'
  };
}

module.exports = { listManifests, readManifest, validateManifest, writeManifest, deleteManifest, summarize };
