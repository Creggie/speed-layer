'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const MANIFEST_DIR = path.join(ROOT, 'manifest');

const cmd = new Command('list');
cmd
  .description('List all sites with platform, enabled status, and pages mode')
  .action(() => {
    const files = fs.readdirSync(MANIFEST_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();

    const rows = [];
    for (const file of files) {
      const filePath = path.join(MANIFEST_DIR, file);
      let d;
      try {
        d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        rows.push({ domain: file.replace('.json', ''), platform: '—', enabled: '—', pages: '—', error: 'JSON error' });
        continue;
      }
      rows.push({
        domain: d.domain || file.replace('.json', ''),
        platform: d.platform || '—',
        enabled: d.enabled ? '\x1b[32m✓ yes\x1b[0m' : '\x1b[31m✗ no\x1b[0m',
        pages: d.pages ? d.pages.mode : 'all',
        error: ''
      });
    }

    const colW = {
      domain:   Math.max(6,  ...rows.map(r => r.domain.length)),
      platform: Math.max(8,  ...rows.map(r => r.platform.length)),
      enabled:  Math.max(7,  ...rows.map(r => stripAnsi(r.enabled).length)),
      pages:    Math.max(5,  ...rows.map(r => r.pages.length))
    };

    const hr = `+-${'-'.repeat(colW.domain)}-+-${'-'.repeat(colW.platform)}-+-${'-'.repeat(colW.enabled)}-+-${'-'.repeat(colW.pages)}-+`;
    const header = `| ${'Domain'.padEnd(colW.domain)} | ${'Platform'.padEnd(colW.platform)} | ${'Enabled'.padEnd(colW.enabled)} | ${'Pages'.padEnd(colW.pages)} |`;

    console.log('\nSpeed Layer — Sites\n' + hr);
    console.log(header);
    console.log(hr);
    for (const r of rows) {
      const enabledPad = colW.enabled - stripAnsi(r.enabled).length;
      const line = `| ${r.domain.padEnd(colW.domain)} | ${r.platform.padEnd(colW.platform)} | ${r.enabled}${' '.repeat(enabledPad)} | ${r.pages.padEnd(colW.pages)} |`;
      console.log(line);
      if (r.error) console.log(`|   \x1b[31m${r.error}\x1b[0m`);
    }
    console.log(hr);
    console.log(`  ${rows.length} site(s)\n`);
  });

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

module.exports = cmd;
