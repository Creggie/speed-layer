'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const ROOT = path.join(__dirname, '..', '..');
const MANIFEST_DIR = path.join(ROOT, 'manifest');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

const cmd = new Command('add-site');
cmd
  .description('Interactive wizard to add a new site manifest pair (domain.json + www.domain.json)')
  .action(async () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(res => rl.question(q, res));

    console.log('\n\x1b[1mSpeed Layer — Add Site Wizard\x1b[0m\n' + '='.repeat(40) + '\n');

    // Step 1: Domain
    let domain = await ask('Domain (e.g. example.com, without www): ');
    domain = domain.trim().toLowerCase().replace(/^www\./, '');
    if (!domain) { console.error('Domain required.'); rl.close(); process.exit(1); }

    // Step 2: Platform
    console.log('\nPlatform options:');
    console.log('  1) DealerInspire');
    console.log('  2) DealerOn');
    console.log('  3) generic');
    const platformChoice = await ask('Platform [1/2/3]: ');
    const platforms = { '1': 'DealerInspire', '2': 'DealerOn', '3': 'generic' };
    const platform = platforms[platformChoice.trim()] || 'generic';

    // Step 3: Options
    const debugInput = await ask('Enable debug logging? [y/N]: ');
    const debug = debugInput.trim().toLowerCase() === 'y';

    const disableIntercept = await ask('Disable Proxy interception (use observer only)? [y/N]: ');
    const disableInterception = disableIntercept.trim().toLowerCase() === 'y';

    const pagesMode = await ask('Pages mode [all/include/exclude] (default: all): ');
    const mode = ['all', 'include', 'exclude'].includes(pagesMode.trim()) ? pagesMode.trim() : 'all';

    rl.close();

    // Load template
    const templateFile = path.join(TEMPLATES_DIR, `${platform.toLowerCase()}.json`);
    let template = {};
    if (fs.existsSync(templateFile)) {
      const raw = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
      // Strip internal-only keys (e.g. _comment) not part of the manifest schema
      Object.keys(raw).filter(k => !k.startsWith('_')).forEach(k => { template[k] = raw[k]; });
    }

    // Build manifest
    const now = new Date().toISOString().split('T')[0];
    const base = {
      domain,
      version: '1.0.0',
      platform,
      enabled: true,
      debug,
      disableInterception,
      idleTimeout: 3000,
      delayedTimeout: 10000,
      ...template,
      ...(mode !== 'all' ? { pages: { mode, patterns: [] } } : {}),
      notes: { created: now, platform }
    };

    const wwwManifest = { ...base, domain: `www.${domain}` };

    // Preview
    console.log('\n\x1b[1mPreview — ' + domain + '.json\x1b[0m');
    console.log(JSON.stringify(base, null, 2));

    // Write atomically
    const writePair = (manifest) => {
      const dest = path.join(MANIFEST_DIR, `${manifest.domain}.json`);
      const tmp = dest + '.tmp';
      if (fs.existsSync(dest)) {
        console.error(`\x1b[31mERROR: ${dest} already exists. Remove it first.\x1b[0m`);
        process.exit(1);
      }
      fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      fs.renameSync(tmp, dest);
      console.log(`\x1b[32m  Created\x1b[0m ${dest}`);
    };

    console.log('\nWriting manifests...');
    writePair(base);
    writePair(wwwManifest);
    console.log('\n\x1b[1mDone!\x1b[0m Review and edit the files, then run:\n  speed-layer validate\n');
  });

module.exports = cmd;
