'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ROOT = path.join(__dirname, '..', '..');
const MANIFEST_DIR = path.join(ROOT, 'manifest');
const SCHEMA_PATH = path.join(ROOT, 'manifest.schema.json');

const cmd = new Command('validate');
cmd
  .description('Validate manifest JSON files against the schema. Exits with code 1 on failure.')
  .option('-f, --file <path>', 'Validate a single manifest file instead of all')
  .action((opts) => {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    let files;
    if (opts.file) {
      files = [path.resolve(opts.file)];
    } else {
      files = fs.readdirSync(MANIFEST_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(MANIFEST_DIR, f));
    }

    let allPassed = true;
    const results = [];

    for (const filePath of files) {
      const name = path.basename(filePath);
      let parsed;
      try {
        parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        results.push({ name, status: 'FAIL', reason: `JSON syntax error: ${e.message}` });
        allPassed = false;
        continue;
      }

      const valid = validate(parsed);
      if (valid) {
        results.push({ name, status: 'OK', reason: '' });
      } else {
        const errors = validate.errors.map(e => `  ${e.instancePath || '(root)'}: ${e.message}`).join('\n');
        results.push({ name, status: 'FAIL', reason: errors });
        allPassed = false;
      }
    }

    // Print results
    const maxName = Math.max(...results.map(r => r.name.length), 8);
    console.log('\nSpeed Layer — Manifest Validation\n' + '='.repeat(50));
    for (const r of results) {
      const status = r.status === 'OK' ? '\x1b[32mOK\x1b[0m  ' : '\x1b[31mFAIL\x1b[0m';
      console.log(`  ${status}  ${r.name.padEnd(maxName)}`);
      if (r.reason) console.log(r.reason);
    }
    console.log('');

    const passed = results.filter(r => r.status === 'OK').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`${passed} passed, ${failed} failed\n`);

    if (!allPassed) process.exit(1);
  });

module.exports = cmd;
