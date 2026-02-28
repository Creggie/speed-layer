#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const pkg = require('../package.json');

program
  .name('speed-layer')
  .description('Speed Layer manifest management CLI')
  .version(pkg.version);

program.addCommand(require('./commands/validate'));
program.addCommand(require('./commands/list'));
program.addCommand(require('./commands/add-site'));

program.parse(process.argv);
