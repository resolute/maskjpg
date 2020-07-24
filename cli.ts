#!/usr/bin/env node
import { promises as fs } from 'fs';
import minimist = require('minimist');
import maskjpg = require('./index');

const run = async (input: string, argv: MaskjpgCommandLineOptions) => {
  const { svg, jpg } = await maskjpg(input, {
    width: argv.width,
    quality: argv.quality,
    uri: argv.uri,
  });
  process.stdout.write(svg);
  if (argv.jpg) {
    await fs.writeFile(argv.jpg, jpg);
  }
};

interface MaskjpgCommandLineOptions {
  _: string[]
  quality?: number,
  width?: number,
  uri?: string,
  jpg?: string,
}

const usage = `
Usage:
${process.argv[1]} [options] alpha.png

Options:
--quality   1-100 JPG quality. Default: 80
--width     Resize the resulting SVG/JPG mask. Default: width of original
--uri       Provide the web relative path to the JPG mask.
            Default: generate a base64 encoded data URI in SVG.
--jpg       Where to save the JPG mask on disk.
            Default: store as base64 encoded data URI in SVG.

`;

const argv = minimist<MaskjpgCommandLineOptions>(process.argv.slice(2));
if (argv._.length !== 1) {
  process.stderr.write(usage);
  throw new Error('Please specify at least and only one PNG image.');
}
run(argv._[0], argv);
