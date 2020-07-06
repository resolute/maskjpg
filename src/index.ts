import { promises as fs } from 'fs';
import crypto = require('crypto');
import Canvas = require('canvas');
import probe = require('probe-image-size');
import sharp = require('sharp');
import imagemin = require('imagemin');
import imageminJpegtran = require('imagemin-jpegtran');
import imageminMozjpeg = require('imagemin-mozjpeg');

const { createCanvas, loadImage } = Canvas;

const createMaskedMap = async (input: string | Buffer) => {
  const img = await loadImage(input);
  const canvas = createCanvas(img.naturalWidth, img.naturalHeight * 2);
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0);
  context.drawImage(img, 0, img.naturalHeight);

  const imagedata = context.getImageData(0, 0, canvas.width, canvas.height);
  const buf32 = new Uint32Array(imagedata.data.buffer);
  const { length } = buf32;
  const halfLength = length >> 1;

  // Gamma correction for semi transparent pixels:
  for (let i = length; --i >= halfLength;) {
    const b = (
      ((((buf32[i] >>> 24) & 0xff) / 255) ** 0.45)
      * 255
    ) | 0;
    buf32[i] = 0xff000000 | (b << 16) | (b << 8) | b;
  }

  // // No Gamma correction on some platforms
  // for (let i = length; --i >= halfLength;) {
  //   const b = (buf32[i] >>> 24) & 0xff;
  //   buf32[i] = 0xff000000 | (b << 16) | (b << 8) | b;
  // }

  for (let i = halfLength; --i > 0;) {
    buf32[i] |= 0xff000000;
  }

  const canvas2 = createCanvas(img.naturalWidth, img.naturalHeight * 2);
  const context2 = canvas2.getContext('2d');
  context2.putImageData(imagedata, 0, 0);
  return canvas2;
};

const getRandomIntInclusive = (min: number, max: number) => {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);
  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
};

const twoHashIds = (input: Buffer) => {
  const hash = crypto.createHash('md4');
  hash.update(input);
  const base64 = hash.digest().toString('base64');
  const match = base64.match(/([a-zA-Z][a-zA-Z0-9]{2}).*?([a-zA-Z][a-zA-Z0-9]{2})/);
  if (!match) {
    throw new Error(`Unable to find acceptable ID in base64 encoded hash “${base64}”`);
  }
  return [match[1], match[2]];
};

const generateSvg = (
  width: number,
  height: number,
  jpgBuffer: Buffer,
  uri: string,
  className?: string,
) => {
  let classString = '';
  if (className) {
    classString = ` class="${className}"`;
  }
  // const randIdA = String.fromCharCode(getRandomIntInclusive(97, 122)); // a-z
  // const randIdB = String.fromCharCode(getRandomIntInclusive(97, 122)); // a-z
  const [idA, idB] = twoHashIds(jpgBuffer);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ${classString}>
  <defs>
    <filter id="${idA}">
      <feOffset dy="-${height}" in="SourceGraphic" result="${idB}"></feOffset>
      <feColorMatrix in="${idB}" result="${idB}" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0"></feColorMatrix>
      <feComposite in="SourceGraphic" in2="${idB}" operator="in"></feComposite>
    </filter>
  </defs>
  <image width="100%" height="200%" xlink:href="${uri}" filter="url(#${idA})"></image>
</svg>`;
};

const integer = <T, U>(arg: T, falseReturn: number | U = 0) => {
  let num: number;
  if (typeof arg === 'string') {
    num = parseInt(arg, 10);
  } else if (typeof arg === 'number') {
    num = arg;
  } else {
    return falseReturn;
  }
  if (!Number.isFinite(num)) {
    return falseReturn;
  }
  return num;
};

const maskjpg = async ({
  src, width, quality, uri, className,
}: {
  src: string,
  width?: number | string,
  quality?: number,
  uri?: string,
  className?: string,
}) => {
  const destination = typeof uri === 'string' ?
    uri :
    `${src.replace(/\.png$/, '')}${width ? `-${width}` : ''}.jpg`;
  let resizedImage: Buffer | undefined;
  if (typeof width !== 'undefined') {
    resizedImage = await sharp(await fs.readFile(src))
      .resize({ width: integer(width, undefined), withoutEnlargement: true })
      .toBuffer();
  }
  const canvas = await createMaskedMap(resizedImage || src);
  const rawJpgMask = canvas.toBuffer('image/jpeg', { quality: 1 });
  const optJpgMask = await imagemin.buffer(rawJpgMask, {
    plugins: [
      imageminJpegtran(),
      imageminMozjpeg({ quality, quantTable: 3 }),
    ],
  });
  const { width: actualWidth, height: doubleHeight } = probe.sync(optJpgMask) as
    { width: number, height: number };
  const actualHeight = doubleHeight >> 1;
  const svg = generateSvg(
    actualWidth,
    actualHeight,
    optJpgMask,
    destination,
    className,
  );
  return {
    jpg: optJpgMask,
    svg,
  };
};

export = maskjpg;
