#!/usr/bin/env node
import { promises as fs } from 'fs';
import path = require('path');
import app = require('./index.js');

(async () => {
  const filename = process.argv[2];
  const quality = parseInt(process.argv[3] || '80', 10);
  const desiredWidth = process.argv[4];
  let outJpgFilename = filename.replace(/\.png$/, '.jpg');
  // let outSvgFilename = filename.replace(/\.png$/, '.svg');
  if (typeof desiredWidth !== 'undefined') {
    outJpgFilename = filename.replace(/\.png$/, `-${desiredWidth}.jpg`);
    // outSvgFilename = filename.replace(/\.png$/, `-${desiredWidth}.svg`);
  }
  const uri = path.basename(outJpgFilename);
  const { jpg, svg } = await app({
    src: filename,
    width: desiredWidth,
    uri,
    quality,
  });
  fs.writeFile(outJpgFilename, jpg);
  // fs.writeFile(outSvgFilename, svg);
  console.log(svg);
})();
