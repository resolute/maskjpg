import sharp from "sharp";
import { integer, readInput, sanitizeQuality, twoHashIds } from "./util";
import { encode as encodeB64 } from "./base64";
// import imagemin from "imagemin";
// import imageminMozjpeg from "imagemin-mozjpeg";
// import { ImagePool } from "@squoosh/lib";
// const imagePool = new ImagePool(1);

/**
 * Perform “premultpilied alpha” on RGBA color values
 * @param alpha 0-255 alpha value
 */
function preMultiplyPixel(alpha: number) {
  return (color: number) => {
    // if (alpha === 0) {
    //   return 0;
    // }
    // return color;
    const preMultipliedValue = Math.round((color / 255) * (alpha / 255) * 255);
    return (((preMultipliedValue / 255) / (alpha / 255)) * 255) | 0;
  };
}

/**
 * Generate a buffer 2x the size of the input, where the top half is
 * premultiplied alpha version of the original and the bottom half contains only
 * the alpha mask of the original with some gamma correction applied.
 * @param buf Buffer of RGBA bitmap pixel data
 */
function makeBitmapMask(buf: Uint8Array) {
  const bufferLength = buf.length;
  const origAndMask = new Uint8Array(bufferLength * 2);
  for (let i = 0; i <= bufferLength - 4; i += 4) {
    const a = buf[i + 3];
    const alphaWithGammaCorrection = (((a / 255) ** 0.45) * 255) | 0;
    const mult = preMultiplyPixel(a);
    const r = mult(buf[i + 0]);
    const g = mult(buf[i + 1]);
    const b = mult(buf[i + 2]);
    origAndMask[i + 0] = r;
    origAndMask[i + 1] = g;
    origAndMask[i + 2] = b;
    origAndMask[i + 3] = 255;
    origAndMask[bufferLength + i + 0] = alphaWithGammaCorrection;
    origAndMask[bufferLength + i + 1] = alphaWithGammaCorrection;
    origAndMask[bufferLength + i + 2] = alphaWithGammaCorrection;
    origAndMask[bufferLength + i + 3] = 255;
  }
  return origAndMask;
}

/**
 * Generate `<svg>` string
 * @param params
 * @param params.width width of SVG
 * @param params.height height of SVG a.k.a. “half-height” of full JPG mask
 * @param params.uri path to JPG relative to SVG or base64 encoded data URI
 * @param params.attr additional attributes to add to `<svg>` tag ex. `{ class:
 *                    'my-stylish-class' }` becomes `<svg …
 *                    class="my-stylish-class">`
 * @param params.idA unique XML/SVG id used to reference filter
 * @param params.idB unique XML/SVG id used to reference filter
 */
function generateSvg({
  width,
  height,
  uri,
  attr,
  idA,
  idB,
}: {
  width: number;
  height: number;
  uri: string;
  attr: { [key: string]: string };
  idA: string;
  idB: string;
}) {
  // { key1: 'val1', key2: 'val2', … } → 'key1="val1" key2="val2"…'
  const attrString = Object.entries({
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    ...attr,
  })
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrString}>` +
    "<defs>" +
    `<filter id="${idA}">` +
    `<feOffset dy="-${height}" in="SourceGraphic" result="${idB}"></feOffset>` +
    `<feColorMatrix in="${idB}" result="${idB}" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0"></feColorMatrix>` +
    `<feComposite in="SourceGraphic" in2="${idB}" operator="in"></feComposite>` +
    "</filter>" +
    "</defs>" +
    `<image width="100%" height="200%" xlink:href="${uri}" filter="url(#${idA})"></image>` +
    "</svg>";
}

/**
 * Normalize command options
 * @param options command options
 */
function normalizeOptions(options: {
  width?: number;
  quality?: number;
  uri?: string;
  attr?: { [key: string]: string };
}) {
  const width = integer(options?.width, 0);
  const quality = sanitizeQuality(options?.quality, undefined);
  const uri = typeof options.uri === "string" && options.uri !== ""
    ? options.uri
    : undefined;
  const attr = typeof options.attr === "object" ? options.attr : {};
  return {
    width,
    quality,
    uri,
    attr,
  };
}

/**
 * Alpha PNG → `<svg>` + JPG
 * @param input path to file, URL, or buffer
 * @param options
 * @param options.width Desired width of JPG/SVG. Default: input width
 * @param options.quality JPG quality 1 to 100. Default: 84
 * @param options.uri URI to reference the JPG in SVG
 * @param options.attr additional attributes for the SVG
 */
async function maskjpg(input: string | Uint8Array, options: {
  width?: number;
  quality?: number;
  uri?: string;
  attr?: { [key: string]: string };
} = {}) {
  // normalize options
  const {
    width: requestedWidth,
    quality,
    uri,
    attr,
  } = normalizeOptions(options);

  // read the input PNG into a Node Buffer
  const pngBuffer = await readInput(input);

  // create a sharp instance with the PNG buffer
  const sharpOriginal = sharp(pngBuffer);

  // perform resize if requested
  if (requestedWidth > 0) {
    sharpOriginal.resize({ width: requestedWidth, withoutEnlargement: true });
  }

  const {
    info: {
      width, // final width of the (resized) source PNG
      height, // final “half” height of the (resized) source PNG
      channels,
    },
    data,
  } = await sharpOriginal
    .raw()
    .toBuffer({ resolveWithObject: true });

  // this only works with a 4-channel PNG input
  if (channels !== 4) {
    throw new Error("Input must contain an alpha channel");
  }

  // Heavy lifting: generate a JPG 2x the height of the input PNG. See
  // makeBitmapMask for details.
  const bitmapMask = makeBitmapMask(data);

  // create a new sharp instance using the newly generated 2x height bitmap data
  const sharpJpg = sharp(bitmapMask, {
    raw: {
      width,
      height: height * 2,
      channels,
    },
  });

  // generate a max quality JPG buffer
  const jpgUnoptimized = await sharpJpg
    .jpeg({ quality: 100 })
    .toBuffer();

  // // run max quality JPG buffer through MozJPEG with user desired quality
  // const jpg = await imagemin.buffer(jpgUnoptimized, {
  //   plugins: [
  //     imageminMozjpeg({ quality, quantTable: 3 }),
  //   ],
  // });
  // // const image = imagePool.ingestImage(jpgUnoptimized);
  // // const jpg = await image.encode({ mozjpeg: {} });
  const jpg = jpgUnoptimized;

  // generate deterministic IDs based on the MD4 hash of the final optimized JPG
  const [idA, idB] = twoHashIds(jpg);

  // generate the `<svg>` string
  const svg = generateSvg({
    width,
    height,
    uri: uri ?? `data:image/jpeg;base64,${encodeB64(jpg)}`,
    attr,
    idA,
    idB,
  });

  return { svg, jpg };
}

export default maskjpg;
